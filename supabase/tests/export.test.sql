-- M8: export_my_data returns only the caller's data; audited; rate limited; not callable by guests.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;
create function pg_temp.mk_user(p_handle text) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, onboarded_at = now() where id = v;
  return v;
end $$;
create function pg_temp.act_as(p_name text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from ids where name = p_name), 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.act_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('ana', pg_temp.mk_user('exp_ana')::text), ('bor', pg_temp.mk_user('exp_bor')::text);

select pg_temp.act_as('bor');
insert into ids values ('space', public.create_space('studio', 'Izvoz studio', 'izvoz-studio-pgtap')::text);
with e as (insert into public.events (space_id, created_by, slug, title)
  values (pg_temp.id('space'), auth.uid(), 'izvoz-dogodek-pgtap', 'Dogodek za izvoz') returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select public.publish_event(pg_temp.id('event'));
select public.follow_user(pg_temp.id('ana'));

select pg_temp.act_as('ana');
select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2, 'Pridem z mamo');
select public.start_conversation(pg_temp.id('bor'), 'Živjo Bor, se vidiva?');

select pg_temp.act_anon();
select throws_ok($$ select public.export_my_data_logged() $$, '42501', null, 'guests cannot export');

select pg_temp.act_as('ana');
create temp table out_ana as select public.export_my_data_logged() as j;
select is((select j->'profile'->>'handle' from out_ana), 'exp_ana', 'own profile');
select is((select j->>'account_email' from out_ana), 'exp_ana@example.test', 'own e-mail');
select is((select jsonb_array_length(j->'bookings') from out_ana), 1, 'own booking');
select is((select j->'bookings'->0->>'note' from out_ana), 'Pridem z mamo', 'booking note');
select is((select j->'messages_sent'->0->>'to' from out_ana), 'exp_bor', 'message recipient by handle');
select is((select j->'followers'->0->>'handle' from out_ana), 'exp_bor', 'followers by handle');
select ok((select j::text not like '%exp_bor@example.test%' from out_ana), 'no other person''s e-mail');
select set_config('role', 'postgres', true);
select is((select count(*)::int from public.admin_audit_log where action = 'data.export_self'
  and actor_id = pg_temp.id('ana')), 1, 'export is audited');
select pg_temp.act_as('ana');
select ok((select (j->'profile') ? 'terms_version' from out_ana), 'terms acceptance included');

-- Bor's export does not contain Ana's booking or message text
select pg_temp.act_as('bor');
select ok((select public.export_my_data_logged()::text not like '%Pridem z mamo%'), 'no one else''s booking notes');

select pg_temp.act_as('ana');
select public.export_my_data_logged(); select public.export_my_data_logged(); select public.export_my_data_logged();
select public.export_my_data_logged();
select throws_ok($$ select public.export_my_data_logged() $$, 'P0001', 'rate_limited', 'at most 5 exports per hour');

select * from finish();
rollback;

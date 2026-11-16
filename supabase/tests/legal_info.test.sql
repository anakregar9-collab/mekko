-- Organizer legal status: who can set it, who can read provider details, publish gate for paid events.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

insert into ids values ('org', pg_temp.mk_user('li_org')::text), ('ana', pg_temp.mk_user('li_ana')::text);
select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('solo_creator', 'Lončki', 'loncki-pgtap')::text);

-- Paid event cannot be published without legal status.
with e as (
  insert into public.events (space_id, created_by, slug, title, payment_mode, price_cents, payment_instructions)
  values (pg_temp.id('space'), auth.uid(), 'loncki-pgtap-e', 'Lončki', 'manual', 2000, 'Gotovina na kraju')
  returning id)
insert into ids select 'event', id::text from e;
insert into public.event_occurrences (event_id, starts_at, ends_at)
values (pg_temp.id('event'), now() + interval '4 days', now() + interval '4 days 2 hours');
select throws_ok($$ select public.publish_event(pg_temp.id('event')) $$, 'P0001', 'legal_info_required',
  'paid events need the organizer legal status');

select throws_ok($$ select public.set_space_legal_info(pg_temp.id('space'), 'sole_trader', 'Ana Lonček s.p.', 'Glavna 1, 1000 Ljubljana', '', 'ana@example.test') $$,
  'P0001', 'registration_required', 's.p. needs a registration number');
select throws_ok($$ select public.set_space_legal_info(pg_temp.id('space'), 'odd', 'A', 'x', null, 'ni-email') $$,
  '23514', null, 'provider details are validated');
select lives_ok($$ select public.set_space_legal_info(pg_temp.id('space'), 'odd', 'Ana Lonček', 'Glavna 1, 1000 Ljubljana', null, 'Ana@Example.test') $$,
  'owner sets ODD status with details');
select is((select contact_email from public.space_legal_info where space_id = pg_temp.id('space')), 'ana@example.test',
  'email is normalised');
select lives_ok($$ select public.publish_event(pg_temp.id('event')) $$, 'paid event can be published now');

select pg_temp.act_as('ana');
select throws_ok($$ select public.set_space_legal_info(pg_temp.id('space'), 'private') $$, '42501', null,
  'outsiders cannot change the legal status');
select is((select legal_name from public.space_legal_info where space_id = pg_temp.id('space')), 'Ana Lonček',
  'signed-in users see provider details');
select throws_ok($$ insert into public.space_legal_info (space_id, legal_name, address, contact_email)
  values (pg_temp.id('space'), 'Ponaredek', 'Nekje 1, Ljubljana', 'x@example.test') $$, '42501', null,
  'no direct writes to provider details');

select pg_temp.act_anon();
select is((select legal_form from public.spaces where id = pg_temp.id('space')), 'odd', 'guests see the legal form');
select throws_ok($$ select legal_name from public.space_legal_info $$, '42501', null, 'guests cannot read provider details');

select * from finish();
rollback;

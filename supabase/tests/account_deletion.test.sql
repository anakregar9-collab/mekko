-- M11: account deletion — request, hiding, cancel, and the purge after 30 days keeps anonymised bookings.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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
create function pg_temp.act_root() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;
insert into ids values ('org', pg_temp.mk_user('del_org')::text), ('ana', pg_temp.mk_user('del_ana')::text),
  ('bor', pg_temp.mk_user('del_bor')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Izbris studio', 'izbris-studio-pgtap')::text);
with e as (insert into public.events (space_id, created_by, slug, title, capacity)
  values (pg_temp.id('space'), auth.uid(), 'izbris-dogodek-pgtap', 'Izbris dogodek', 5) returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select public.publish_event(pg_temp.id('event'));
select throws_ok($$ select public.request_account_deletion() $$, 'P0001', 'owns_spaces', 'owners must hand over spaces first');

select pg_temp.act_as('ana');
insert into ids select 'b_ana', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2, 'Alergija na lateks')::text;
select pg_temp.act_root();
with i as (insert into public.ideas (author_id, slug, title, body, status, published_at)
  values (pg_temp.id('ana'), 'izbris-ideja-pgtap', 'Ideja za izbris', '1. Pripravi papir in barve. 2. Nariši.', 'published', now()) returning id)
insert into ids select 'idea', id::text from i;
select pg_temp.act_as('bor');
select public.follow_user(pg_temp.id('ana'));
select pg_temp.act_as('ana');
select public.start_conversation(pg_temp.id('org'), 'Živjo Bor');

select pg_temp.act_as('bor');
insert into ids select 'b_bor', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1)::text;
select public.add_idea_comment(pg_temp.id('idea'), 'Super ideja!');

-- Ana requests deletion
select pg_temp.act_as('ana');
select lives_ok($$ select public.request_account_deletion() $$, 'member can request deletion');
select pg_temp.act_root();
select is((select status from public.profiles where id = pg_temp.id('ana'))::text, 'deleted', 'account hidden at once');
select is((select status from public.bookings where id = pg_temp.id('b_ana'))::text, 'cancelled_by_user', 'future booking cancelled');
select pg_temp.act_as('bor');
select is((select count(*)::int from public.profiles where id = pg_temp.id('ana')), 0, 'profile hidden from others');
select is((select count(*)::int from public.ideas where id = pg_temp.id('idea')), 0, 'ideas hidden from others');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', null,
  'others unaffected (bor already booked)');

-- Ana changes her mind
select pg_temp.act_as('ana');
select lives_ok($$ select public.cancel_account_deletion() $$, 'cancel within 30 days');
select pg_temp.act_as('bor');
select is((select count(*)::int from public.ideas where id = pg_temp.id('idea')), 1, 'ideas visible again');

-- Ana deletes for real; 31 days later the purge runs
select pg_temp.act_as('ana');
insert into ids select 'b_ana2', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1, 'Pridem kasneje')::text;
select pg_temp.act_root();
update public.bookings set status = 'confirmed' where id = pg_temp.id('b_ana2');
select pg_temp.act_as('ana');
select public.request_account_deletion();
select pg_temp.act_root();
update public.profiles set deletion_requested_at = now() - interval '31 days' where id = pg_temp.id('ana');
-- a past (kept) booking: move it to the past so it is not cancelled by the request
update public.bookings set status = 'confirmed' where id = pg_temp.id('b_ana2');
select is(public.purge_deleted_accounts(), 1, 'one account purged');
select is((select count(*)::int from auth.users where id = pg_temp.id('ana')), 0, 'auth user removed');
select is((select count(*)::int from public.profiles where id = pg_temp.id('ana')), 0, 'profile removed');
select is((select count(*)::int from public.ideas where id = pg_temp.id('idea')), 0, 'ideas removed');
select is((select count(*)::int from public.idea_comments where body = 'Super ideja!'), 0, 'comments on her ideas removed with them');
select is((select count(*)::int from public.messages where body = 'Živjo Bor'), 0, 'her messages removed');
select is((select booker_id from public.bookings where id = pg_temp.id('b_ana2')), null, 'booking kept without the person');
select is((select note from public.bookings where id = pg_temp.id('b_ana2')), null, 'booking note cleared');
select is((select quantity from public.bookings where id = pg_temp.id('b_ana2'))::int, 1, 'booking numbers kept for the organizer');
select is((select count(*)::int from public.bookings where id = pg_temp.id('b_bor')), 1, 'other people''s bookings untouched');
select is((select count(*)::int from public.admin_audit_log where action = 'account.purged' and target_id = pg_temp.id('ana')::text), 1,
  'purge audited');

select * from finish();
rollback;

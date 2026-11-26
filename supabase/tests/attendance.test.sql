-- Studio tools: attendance marks are team-only and limited to bookings that cover the session.
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
create function pg_temp.act_root() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('org', pg_temp.mk_user('att_org')::text), ('ana', pg_temp.mk_user('att_ana')::text),
  ('other', pg_temp.mk_user('att_other')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Studio prisotnost', 'studio-prisotnost-pgtap')::text);
with e as (insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking)
  values (pg_temp.id('space'), auth.uid(), 'prisotnost-pgtap', 'Prisotnost', 5, 2) returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '2 hours', now() + interval '4 hours') returning id)
insert into ids select 'occ', id::text from o;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '6 days', now() + interval '6 days 2 hours') returning id)
insert into ids select 'occ_later', id::text from o;
select public.publish_event(pg_temp.id('event'));

select pg_temp.act_as('ana');
insert into ids select 'b_ana', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1)::text;
insert into ids select 'b_ana_later', public.book_event(pg_temp.id('event'), pg_temp.id('occ_later'), 1)::text;

-- Attendee cannot mark herself
select throws_ok($$ select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), true) $$,
  '42501', 'not_allowed', 'attendee cannot mark attendance');

-- Outsider cannot mark
select pg_temp.act_as('other');
select throws_ok($$ select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), true) $$,
  '42501', 'not_allowed', 'other user cannot mark attendance');

select pg_temp.act_as('org');
select lives_ok($$ select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), true) $$,
  'team marks present from 12 h before');
select is((select present from public.attendance where booking_id = pg_temp.id('b_ana')), true, 'stored as present');
select lives_ok($$ select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), false) $$, 'change to absent');
select is((select present from public.attendance where booking_id = pg_temp.id('b_ana')), false, 'updated to absent');
select throws_ok($$ select public.set_attendance(pg_temp.id('b_ana_later'), pg_temp.id('occ_later'), true) $$,
  'P0001', 'attendance_not_open', 'not open for a session days away');
select throws_ok($$ select public.set_attendance(pg_temp.id('b_ana_later'), pg_temp.id('occ'), true) $$,
  'P0002', 'booking_not_found', 'booking must cover the session');
select lives_ok($$ select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), null) $$, 'clear the mark');
select is((select count(*)::int from public.attendance), 0, 'mark removed');

-- Visibility: only the team
select public.set_attendance(pg_temp.id('b_ana'), pg_temp.id('occ'), true);
select pg_temp.act_as('ana');
select is((select count(*)::int from public.attendance), 0, 'attendee does not see attendance rows');
select pg_temp.act_as('other');
select throws_ok($$ insert into public.attendance (booking_id, occurrence_id, present)
  values (pg_temp.id('b_ana'), pg_temp.id('occ'), true) $$, '42501', null, 'no direct writes');

select * from finish();
rollback;

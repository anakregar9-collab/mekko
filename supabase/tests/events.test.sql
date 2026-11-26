-- RLS / authorization tests: events, occurrences, bookings, capacity, notifications.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

create temp table ids (name text primary key, id uuid);
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
create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.act_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;
create function pg_temp.affected(p_sql text) returns int language plpgsql as $f$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $f$;
create function pg_temp.id(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name;
$$;

insert into ids values
  ('org', pg_temp.mk_user('org')),
  ('ana', pg_temp.mk_user('ana')),
  ('bor', pg_temp.mk_user('bor')),
  ('cene', pg_temp.mk_user('cene')),
  ('tuj', pg_temp.mk_user('tuj'));

-- Organizer: space + draft event (capacity 3) + one future occurrence.
select pg_temp.act_as(pg_temp.id('org'));
insert into ids values ('space', public.create_space('studio', 'Glina', 'glina-test'));
with e as (
  insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking, address, online_url)
  values (pg_temp.id('space'), auth.uid(), 'keramika-test', 'Keramika test', 3, 4,
          'Trubarjeva 1, Ljubljana', 'https://meet.example/abc')
  returning id)
insert into ids select 'event', id from e;
with o as (
  insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '7 days', now() + interval '7 days 3 hours') returning id)
insert into ids select 'occ', id from o;

-- Drafts are private ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id('ana'));
select is((select count(*)::int from public.events where slug = 'keramika-test'), 0, 'draft events are hidden from visitors');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', 'event_not_bookable',
  'cannot book a draft');

select pg_temp.act_as(pg_temp.id('tuj'));
select throws_ok($$ select public.publish_event(pg_temp.id('event')) $$, '42501', null, 'outsider cannot publish');
select is(pg_temp.affected($q$ update public.events set title = 'Ugrabljeno' where slug = 'keramika-test' $q$), 0,
  'outsider cannot edit event');
select throws_ok($$ insert into public.events (space_id, created_by, slug, title) values (pg_temp.id('space'), auth.uid(), 'vrinek', 'Vrinjen dogodek') $$,
  '42501', null, 'outsider cannot create events in someone else''s space');

select pg_temp.act_as(pg_temp.id('org'));
select lives_ok($$ select public.publish_event(pg_temp.id('event')) $$, 'organizer publishes');
select throws_ok($$ update public.events set status = 'draft' where slug = 'keramika-test' $$, '42501', null,
  'status only changes through RPCs');

-- Guest preview -----------------------------------------------------------------
select pg_temp.act_anon();
select is((select title from public.events where slug = 'keramika-test'), 'Keramika test', 'guests see published preview');
select throws_ok($$ select address from public.events where slug = 'keramika-test' $$, '42501', null,
  'guests cannot read the address');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, '42501', null, 'guests cannot book');

select pg_temp.act_as(pg_temp.id('ana'));
select is((select address from public.events where slug = 'keramika-test'), 'Trubarjeva 1, Ljubljana', 'signed-in users see the address');
select throws_ok($$ select online_url from public.events where slug = 'keramika-test' $$, '42501', null,
  'online link is never readable directly');
select is(public.event_online_url(pg_temp.id('event')), null, 'online link hidden before booking');

-- Booking & capacity ------------------------------------------------------------
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 5) $$, 'P0001', 'invalid_quantity',
  'max per booking enforced');
select lives_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2) $$, 'ana books 2 seats');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', 'already_booked',
  'one active booking per person per occurrence');
select is(public.event_online_url(pg_temp.id('event')), 'https://meet.example/abc', 'booked attendee gets the online link');
select is((select count(*)::int from public.notifications where kind = 'booking_confirmed'), 1, 'booking confirmation notification');
select throws_ok($$ insert into public.bookings (event_id, occurrence_id, booker_id) values (pg_temp.id('event'), pg_temp.id('occ'), auth.uid()) $$,
  '42501', null, 'bookings cannot be inserted directly (capacity bypass)');

select pg_temp.act_as(pg_temp.id('bor'));
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2) $$, 'P0001', 'sold_out',
  'capacity enforced (2 + 2 > 3)');
select lives_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'last seat can be taken');
select is(public.seats_taken(pg_temp.id('event'), pg_temp.id('occ')), 3, 'seats taken counted');
select is((select count(*)::int from public.bookings), 1, 'visitors see only their own bookings');

select pg_temp.act_as(pg_temp.id('cene'));
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', 'sold_out', 'sold out');
select throws_ok($$ select public.cancel_booking((select id from public.bookings limit 1)) $$, 'P0002', 'booking_not_found',
  'cannot cancel someone else''s booking');

-- Organizer view ------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id('org'));
select is((select count(*)::int from public.bookings where event_id = pg_temp.id('event')), 2, 'organizer sees all bookings');
select is((select count(*)::int from public.profiles where handle in ('ana', 'bor')), 2, 'organizer sees attendee profiles');
select is(public.notify_attendees(pg_temp.id('event'), 'Prinesite predpasnik!'), 2, 'announcement reaches 2 attendees');
select lives_ok($$ select public.cancel_event(pg_temp.id('event'), 'Bolezen učitelja') $$, 'organizer cancels event');

select pg_temp.act_as(pg_temp.id('ana'));
select is((select count(*)::int from public.notifications where kind = 'event_cancelled'), 1,
  'attendee notified about cancellation');

select * from finish();
rollback;

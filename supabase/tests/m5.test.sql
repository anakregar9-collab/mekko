-- M5: sessions (reschedule/cancel), waitlist, communities (join, members-only, announcements), reminders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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
create function pg_temp.notes(p_kind text) returns int language sql as $$
  select count(*)::int from public.notifications where kind = p_kind $$;

insert into ids values ('org', pg_temp.mk_user('m5_org')::text), ('ana', pg_temp.mk_user('m5_ana')::text),
  ('bor', pg_temp.mk_user('m5_bor')::text), ('cene', pg_temp.mk_user('m5_cene')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('community', 'Krožek M5', 'krozek-m5-pgtap')::text);
with e as (insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking)
  values (pg_temp.id('space'), auth.uid(), 'm5-dogodek-pgtap', 'M5 dogodek', 2, 2) returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '5 days', now() + interval '5 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '12 days', now() + interval '12 days 2 hours') returning id)
insert into ids select 'occ2', id::text from o;
select public.publish_event(pg_temp.id('event'));

-- Waitlist -------------------------------------------------------------------------------
select pg_temp.act_as('bor');
select throws_ok($$ select public.join_waitlist(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', 'seats_available',
  'no waitlist while seats are free');
select pg_temp.act_as('ana');
insert into ids select 'b_ana', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2)::text;
select pg_temp.act_as('bor');
select lives_ok($$ select public.join_waitlist(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'join the waitlist when full');
select is((select count(*)::int from public.event_waitlist), 1, 'own waitlist entry visible');
select pg_temp.act_as('ana');
select public.cancel_booking(pg_temp.id('b_ana'));
select pg_temp.act_as('bor');
select is(pg_temp.notes('waitlist_spot'), 1, 'freed seat notifies the waiting person');
select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1);
select is((select count(*)::int from public.event_waitlist), 0, 'booking removes the waitlist entry');

-- Reschedule / cancel a session ------------------------------------------------------------
select throws_ok($$ select public.reschedule_occurrence(pg_temp.id('occ'), now() + interval '6 days', now() + interval '6 days 1 hour') $$,
  '42501', null, 'only the team can move sessions');
select pg_temp.act_as('org');
select throws_ok($$ select public.reschedule_occurrence(pg_temp.id('occ'), now() - interval '1 day', now()) $$,
  'P0001', 'invalid_session_time', 'cannot move into the past');
select is(public.reschedule_occurrence(pg_temp.id('occ'), now() + interval '6 days', now() + interval '6 days 2 hours'), 1,
  'reschedule notifies one booker');
select pg_temp.act_as('bor');
select is(pg_temp.notes('session_changed'), 1, 'booker got the change notice');
select is((select status::text from public.bookings where booker_id = auth.uid() and occurrence_id = pg_temp.id('occ')),
  'confirmed', 'booking stays valid after a move');
select pg_temp.act_as('org');
select throws_ok($$ select public.cancel_occurrence(pg_temp.id('occ'), '') $$, 'P0001', 'reason_required', 'cancel needs a reason');
select is(public.cancel_occurrence(pg_temp.id('occ'), 'Bolezen'), 1, 'cancel one session');
select pg_temp.act_as('bor');
select is((select status::text from public.bookings where booker_id = auth.uid() and occurrence_id = pg_temp.id('occ')),
  'cancelled_by_organizer', 'bookings of the cancelled session are cancelled');

-- Communities -------------------------------------------------------------------------------
select pg_temp.act_root();
update public.spaces set membership_mode = 'none' where id = pg_temp.id('space');
select pg_temp.act_as('bor');
select throws_ok($$ select public.join_space(pg_temp.id('space')) $$, 'P0001', 'membership_closed', 'cannot join a space without membership');
select pg_temp.act_root();
update public.spaces set membership_mode = 'approval' where id = pg_temp.id('space');
select pg_temp.act_as('bor');
select is(public.join_space(pg_temp.id('space')), 'pending', 'approval spaces create a request');
select throws_ok($$ select public.respond_space_invite(pg_temp.id('space'), true) $$, 'P0002', 'invite_not_found',
  'a join request cannot be self-accepted as a team invite');
select pg_temp.act_as('org');
select lives_ok($$ select public.respond_member_request(pg_temp.id('space'), pg_temp.id('bor'), true) $$, 'admin accepts');

-- Members-only event + announcement
with e as (insert into public.events (space_id, created_by, slug, title, visibility, capacity)
  values (pg_temp.id('space'), auth.uid(), 'm5-clani-pgtap', 'Samo za člane', 'members', 10) returning id)
insert into ids select 'mev', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('mev'), now() + interval '22 hours', now() + interval '24 hours') returning id)
insert into ids select 'mocc', id::text from o;
select public.publish_event(pg_temp.id('mev'));
select public.create_space_post(pg_temp.id('space'), 'Ta teden prinesite volno!');

select pg_temp.act_anon();
select is((select count(*)::int from public.events where id = pg_temp.id('mev')), 0, 'guests do not see members-only events');
select pg_temp.act_as('cene');
select is((select count(*)::int from public.events where id = pg_temp.id('mev')), 0, 'non-members do not see members-only events');
select throws_ok($$ select public.book_event(pg_temp.id('mev'), pg_temp.id('mocc'), 1) $$, 'P0001', 'members_only',
  'non-members cannot book members-only events');
select is((select count(*)::int from public.space_posts), 0, 'non-members cannot read announcements');
select pg_temp.act_as('bor');
select is((select count(*)::int from public.space_posts), 1, 'members read announcements');
select is(pg_temp.notes('community'), 2, 'member notified: accepted + new announcement');
select public.book_event(pg_temp.id('mev'), pg_temp.id('mocc'), 1);

-- Reminders (session starts in ~23 h) -------------------------------------------------------------
select pg_temp.act_root();
select ok(public.send_event_reminders() >= 1, 'reminder job sends');
select is(public.send_event_reminders(), 0, 'reminders are sent once');

select * from finish();
rollback;

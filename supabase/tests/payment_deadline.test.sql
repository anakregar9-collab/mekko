-- Optional payment deadline: due time snapshot, automatic release, locked terms.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

insert into ids values ('org', pg_temp.mk_user('dl_org')::text), ('ana', pg_temp.mk_user('dl_ana')::text),
  ('bor', pg_temp.mk_user('dl_bor')::text);
select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Rok plačila', 'rok-placila-pgtap')::text);
select public.set_space_legal_info(pg_temp.id('space'), 'private');

select throws_ok($$
  insert into public.events (space_id, created_by, slug, title, payment_deadline_hours)
  values (pg_temp.id('space'), auth.uid(), 'brezplacen-rok-pgtap', 'Brezplačen', 48) $$,
  '23514', null, 'free events cannot have a payment deadline');

with e as (
  insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking,
    payment_mode, price_cents, payment_instructions, payment_deadline_hours)
  values (pg_temp.id('space'), auth.uid(), 'rok-pgtap', 'Rok', 2, 2, 'manual', 1500, 'Gotovina na kraju', 48)
  returning id)
insert into ids select 'event', id::text from e;
with o as (
  insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '10 days', now() + interval '10 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select public.publish_event(pg_temp.id('event'));
select throws_ok($$ update public.events set payment_deadline_hours = 24 where id = pg_temp.id('event') $$,
  'P0001', 'payment_terms_locked', 'deadline is locked after publishing');

select pg_temp.act_as('ana');
insert into ids select 'b_ana', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2)::text;
select ok((select payment_due_at between now() + interval '47 hours' and now() + interval '49 hours'
           from public.bookings where id = pg_temp.id('b_ana')), 'due time = booking + 48 h');
select ok((select body like '%Plačaj do%' from public.notifications order by id desc limit 1),
  'booker is told the deadline');

select pg_temp.act_as('bor');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', 'sold_out',
  'unpaid reservation holds the seats before the deadline');
select throws_ok($$ select public.release_overdue_reservations() $$, '42501', null,
  'users cannot run the release job');

-- Deadline passes.
select pg_temp.act_root();
update public.bookings set payment_due_at = now() - interval '1 minute' where id = pg_temp.id('b_ana');
select pg_temp.act_as('bor');
select lives_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$,
  'booking after the deadline releases the overdue seats first');
select pg_temp.act_as('ana');
select is((select status::text from public.bookings where id = pg_temp.id('b_ana')), 'cancelled_by_organizer',
  'overdue reservation is released');
select pg_temp.act_as('ana');
select is((select count(*)::int from public.notifications where kind = 'booking_released'), 1,
  'released booker is notified');

select * from finish();
rollback;

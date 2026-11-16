-- Manual / off-platform payment events: snapshot, organizer confirmation, release, locked terms, grants.
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

insert into ids values
  ('org', pg_temp.mk_user('pay_org')::text),
  ('ana', pg_temp.mk_user('pay_ana')::text),
  ('bor', pg_temp.mk_user('pay_bor')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Statve', 'statve-pgtap')::text);

select throws_ok($$
  insert into public.events (space_id, created_by, slug, title, payment_mode, price_cents)
  values (pg_temp.id('space'), auth.uid(), 'brez-navodil-pgtap', 'Brez navodil', 'manual', 2500) $$,
  '23514', null, 'manual payment needs payment instructions');
select throws_ok($$
  insert into public.events (space_id, created_by, slug, title, payment_mode, price_cents, payment_instructions,
    registration_mode, external_url)
  values (pg_temp.id('space'), auth.uid(), 'zunanje-pgtap', 'Zunanje', 'manual', 2500, 'Gotovina na kraju',
    'external', 'https://example.org') $$,
  '23514', null, 'manual payment is only for native registration');
select throws_ok($$
  insert into public.events (space_id, created_by, slug, title, price_cents)
  values (pg_temp.id('space'), auth.uid(), 'cena-brez-nacina-pgtap', 'Cena', 2500) $$,
  '23514', null, 'free events carry no price');

with e as (
  insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking,
    payment_mode, price_cents, payment_instructions)
  values (pg_temp.id('space'), auth.uid(), 'tkanje-pgtap', 'Tkanje', 3, 3, 'manual', 2500,
    'Nakazilo na SI56 0000 0000 0000 000, sklic = tvoje ime')
  returning id)
insert into ids select 'event', id::text from e;
with o as (
  insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '5 days', now() + interval '5 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select lives_ok($$ update public.events set price_cents = 3000 where id = pg_temp.id('event') $$,
  'draft price can still change');
select public.publish_event(pg_temp.id('event'));
select throws_ok($$ update public.events set price_cents = 1000 where id = pg_temp.id('event') $$,
  'P0001', 'payment_terms_locked', 'price is locked after publishing');

-- Visibility of terms ---------------------------------------------------------------
select pg_temp.act_anon();
select is((select price_cents from public.events where id = pg_temp.id('event')), 3000, 'guests see the price');
select throws_ok($$ select payment_instructions from public.events where id = pg_temp.id('event') $$,
  '42501', null, 'guests cannot read payment instructions');
select pg_temp.act_as('ana');
select ok((select payment_instructions from public.events where id = pg_temp.id('event')) like 'Nakazilo%',
  'signed-in users see payment instructions');

-- Booking snapshot -------------------------------------------------------------------
insert into ids select 'b_ana', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 2, 'Prideva dve')::text;
select is((select payment_state from public.bookings where id = pg_temp.id('b_ana')), 'awaiting', 'booking awaits payment');
select is((select amount_cents from public.bookings where id = pg_temp.id('b_ana')), 6000, 'amount = price × quantity');
select is((select title from public.notifications where kind = 'booking_confirmed' order by id desc limit 1),
  'Mesto je rezervirano – čaka na plačilo', 'booker is told payment is still expected');
select is(public.seats_taken(pg_temp.id('event'), pg_temp.id('occ')), 2, 'awaiting bookings hold their seats');
select throws_ok($$ select public.confirm_booking_payment(pg_temp.id('b_ana')) $$, 'P0002', 'booking_not_found',
  'bookers cannot confirm their own payment');
select throws_ok($$ update public.bookings set payment_state = 'organizer_confirmed' $$, '42501', null,
  'no direct updates to payment state');

select pg_temp.act_as('bor');
insert into ids select 'b_bor', public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1)::text;

-- Organizer actions ------------------------------------------------------------------
select pg_temp.act_as('org');
select lives_ok($$ select public.confirm_booking_payment(pg_temp.id('b_ana')) $$, 'organizer confirms receipt');
select is((select payment_state from public.bookings where id = pg_temp.id('b_ana')), 'organizer_confirmed',
  'state records organizer confirmation');
select throws_ok($$ select public.confirm_booking_payment(pg_temp.id('b_ana')) $$, 'P0001', 'invalid_status',
  'cannot confirm twice');
select throws_ok($$ select public.release_unpaid_booking(pg_temp.id('b_bor'), '') $$, 'P0001', 'reason_required',
  'releasing needs a reason');
select lives_ok($$ select public.release_unpaid_booking(pg_temp.id('b_bor'), 'Plačilo ni prispelo do roka') $$,
  'organizer releases an unpaid reservation');

select pg_temp.act_as('bor');
select is((select count(*)::int from public.notifications where kind = 'booking_released'), 1,
  'released booker is notified with the reason');

select * from finish();
rollback;

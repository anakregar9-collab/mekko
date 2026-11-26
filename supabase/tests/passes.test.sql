-- M7a passes: request, confirm, book with a pass, visits come back on cancellation, expiry, extension, access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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

insert into ids values ('org', pg_temp.mk_user('pas_org')::text), ('ana', pg_temp.mk_user('pas_ana')::text),
  ('bor', pg_temp.mk_user('pas_bor')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Joga karte', 'joga-karte-pgtap')::text);
insert into ids values ('space2', public.create_space('studio', 'Drug studio', 'drug-studio-karte-pgtap')::text);

-- Paid pass types need the legal status
select throws_ok($$ insert into public.pass_types (space_id, name, visits, price_cents, validity_days, payment_instructions, created_by)
  values (pg_temp.id('space'), '10 obiskov', 10, 9000, 90, 'IBAN SI56 TEST', auth.uid()) $$,
  'P0001', 'legal_info_required', 'legal status required for passes');
select pg_temp.act_root();
update public.spaces set legal_form = 'sole_trader' where id in (pg_temp.id('space'), pg_temp.id('space2'));
select pg_temp.act_as('org');
with t as (insert into public.pass_types (space_id, name, visits, price_cents, validity_days, payment_instructions, payment_link, created_by)
  values (pg_temp.id('space'), '3 obiski', 3, 3000, 30, 'IBAN SI56 TEST', 'https://buy.stripe.com/test_abc', auth.uid()) returning id)
insert into ids select 'type', id::text from t;
select throws_ok($$ insert into public.pass_types (space_id, name, visits, price_cents, validity_days, payment_instructions, payment_link, created_by)
  values (pg_temp.id('space'), 'Slaba', 3, 3000, 30, 'IBAN SI56 TEST', 'javascript:alert(1)', auth.uid()) $$,
  '23514', null, 'payment link must be https');

-- Event that accepts passes, two sessions, 2 seats
with e as (insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking, accepts_passes)
  values (pg_temp.id('space'), auth.uid(), 'joga-karte-dogodek-pgtap', 'Joga', 2, 2, true) returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '2 days', now() + interval '2 days 1 hour') returning id)
insert into ids select 'occ1', id::text from o;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '60 days', now() + interval '60 days 1 hour') returning id)
insert into ids select 'occ_late', id::text from o;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '9 days', now() + interval '9 days 1 hour') returning id)
insert into ids select 'occ2', id::text from o;
select public.publish_event(pg_temp.id('event'));
-- An event in another space
with e as (insert into public.events (space_id, created_by, slug, title, accepts_passes)
  values (pg_temp.id('space2'), auth.uid(), 'drug-karte-pgtap', 'Drugje', true) returning id)
insert into ids select 'other_event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('other_event'), now() + interval '3 days', now() + interval '3 days 1 hour') returning id)
insert into ids select 'other_occ', id::text from o;
select public.publish_event(pg_temp.id('other_event'));

-- Guests see active pass types but not payment details
select pg_temp.act_anon();
select is((select count(*)::int from public.pass_types where id = pg_temp.id('type')), 1, 'guests see pass types');
select throws_ok($$ select payment_instructions from public.pass_types $$, '42501', null, 'guests cannot read payment details');

-- Request
select pg_temp.act_as('ana');
insert into ids select 'pass', public.request_pass(pg_temp.id('type'))::text;
select throws_ok($$ select public.request_pass(pg_temp.id('type')) $$, 'P0001', 'pass_already_requested', 'one open request per type');
select is((select status from public.passes where id = pg_temp.id('pass')), 'awaiting', 'request awaits payment');
select throws_ok($$ select public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ1'), 1, pg_temp.id('pass')) $$,
  'P0001', 'pass_not_valid', 'unpaid pass cannot be used');
select throws_ok($$ select public.confirm_pass(pg_temp.id('pass')) $$, '42501', 'not_allowed', 'holder cannot confirm own pass');

select pg_temp.act_as('bor');
select is((select count(*)::int from public.passes), 0, 'others cannot see the pass');
select is(public.pass_visits_used(pg_temp.id('pass')), 0, 'others get no usage data');

-- Organizer confirms
select pg_temp.act_as('org');
select lives_ok($$ select public.confirm_pass(pg_temp.id('pass')) $$, 'organizer confirms payment');
select ok((select valid_until between now() + interval '29 days' and now() + interval '31 days' from public.passes where id = pg_temp.id('pass')),
  'valid for validity_days');

-- Book with the pass
select pg_temp.act_as('ana');
select lives_ok($$ insert into ids select 'b1', public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ1'), 2, pg_temp.id('pass'))::text $$,
  'book 2 persons with the pass');
select is(public.pass_visits_used(pg_temp.id('pass')), 2, '2 visits used');
select is((select payment_state from public.bookings where id = pg_temp.id('b1')), 'none', 'pass booking needs no payment');
select throws_ok($$ select public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ2'), 2, pg_temp.id('pass')) $$,
  'P0001', 'pass_no_visits', 'cannot exceed remaining visits');
select throws_ok($$ select public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ_late'), 1, pg_temp.id('pass')) $$,
  'P0001', 'pass_expired', 'session after expiry is refused');
select throws_ok($$ select public.book_with_pass(pg_temp.id('other_event'), pg_temp.id('other_occ'), 1, pg_temp.id('pass')) $$,
  'P0001', 'pass_not_valid', 'pass only works in its own space');

-- Organizer cancels the session → visits come back
select pg_temp.act_as('org');
select public.cancel_occurrence(pg_temp.id('occ1'), 'Bolezen');
select pg_temp.act_as('ana');
select is(public.pass_visits_used(pg_temp.id('pass')), 0, 'cancelled session gives the visits back');

-- Extension
select pg_temp.act_as('org');
select throws_ok($$ select public.extend_pass(pg_temp.id('pass'), now() + interval '1 day') $$, 'P0001', 'invalid_date',
  'extension must be later than the current end');
select lives_ok($$ select public.extend_pass(pg_temp.id('pass'), now() + interval '90 days') $$, 'organizer extends');
select pg_temp.act_as('ana');
select lives_ok($$ select public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ_late'), 1, pg_temp.id('pass')) $$,
  'late session works after extension');

-- Event not accepting passes
select pg_temp.act_as('org');
update public.events set accepts_passes = false where id = pg_temp.id('event');
select pg_temp.act_as('ana');
select throws_ok($$ select public.book_with_pass(pg_temp.id('event'), pg_temp.id('occ2'), 1, pg_temp.id('pass')) $$,
  'P0001', 'pass_not_accepted', 'only events that accept passes');

-- Cancel the pass: notification to the holder
select pg_temp.act_as('org');
select public.cancel_pass(pg_temp.id('pass'), 'Vračilo denarja po dogovoru');
select pg_temp.act_as('ana');
select is((select count(*)::int from public.notifications where kind = 'pass' and title like 'Karta je preklicana%'), 1,
  'holder is told the pass was cancelled');

select * from finish();
rollback;

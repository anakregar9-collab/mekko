-- M7b courses: paid access only after confirmation; outline public; previews; progress; organizer tools.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

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

insert into ids values ('org', pg_temp.mk_user('crs_org')::text), ('ana', pg_temp.mk_user('crs_ana')::text),
  ('bor', pg_temp.mk_user('crs_bor')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Tečaji studio', 'tecaji-studio-pgtap')::text);

select throws_ok($$ insert into public.courses (space_id, slug, title, price_cents, payment_instructions, created_by)
  values (pg_temp.id('space'), 'akvarel-pgtap', 'Akvarel', 4900, 'IBAN SI56 TEST', auth.uid()) $$,
  'P0001', 'legal_info_required', 'paid course needs legal status');
select pg_temp.act_root();
update public.spaces set legal_form = 'sole_trader' where id = pg_temp.id('space');
select pg_temp.act_as('org');
with c as (insert into public.courses (space_id, slug, title, price_cents, payment_instructions, payment_link, created_by)
  values (pg_temp.id('space'), 'akvarel-pgtap', 'Akvarel', 4900, 'IBAN SI56 TEST', 'https://buy.stripe.com/x', auth.uid()) returning id)
insert into ids select 'course', id::text from c;
select throws_ok($$ update public.courses set status = 'published' where id = pg_temp.id('course') $$,
  'P0001', 'course_needs_lessons', 'cannot publish without a lesson with video');
insert into ids select 'l1', public.add_lesson(pg_temp.id('course'), 'Uvod', 'dQw4w9WgXcQ', 'Potrebuješ čopič.', true)::text;
insert into ids select 'l2', public.add_lesson(pg_temp.id('course'), 'Mešanje barv', 'aaaaaaaaaaa', 'Skrivne beležke', false)::text;
insert into ids select 'l3', public.add_lesson(pg_temp.id('course'), 'Prvi cvet', 'bbbbbbbbbbb', null, false)::text;
select throws_ok($$ select public.add_lesson(pg_temp.id('course'), 'Slab', 'https://x', null, false) $$,
  '23514', null, 'video id must be a YouTube id');
select lives_ok($$ update public.courses set status = 'published' where id = pg_temp.id('course') $$, 'publish');
select public.move_lesson(pg_temp.id('l3'), true);
select is((select title from public.course_outline(pg_temp.id('course')) where position_no = 2), 'Prvi cvet', 'move lesson up');

-- Guests: outline yes, locked videos no, preview yes, payment details no
select pg_temp.act_anon();
select is((select count(*)::int from public.course_outline(pg_temp.id('course'))), 3, 'guests see the outline');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('course')), 1, 'guests get only the preview lesson');
select is((select youtube_id from public.course_lessons where id = pg_temp.id('l1')), 'dQw4w9WgXcQ', 'preview video is visible');
select throws_ok($$ select payment_instructions from public.courses $$, '42501', null, 'guests cannot read payment details');

-- Buyer: awaiting → no access
select pg_temp.act_as('ana');
select is(public.enroll_course(pg_temp.id('course')), 'awaiting', 'paid course waits for payment');
select throws_ok($$ select public.enroll_course(pg_temp.id('course')) $$, 'P0001', 'already_enrolled', 'only one enrollment');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('course')), 1, 'no locked lessons before confirmation');
select throws_ok($$ select public.set_lesson_done(pg_temp.id('l2'), true) $$, '42501', 'not_allowed', 'no progress before access');
select throws_ok($$ select public.confirm_enrollment((select id from public.course_enrollments where profile_id = auth.uid())) $$,
  '42501', 'not_allowed', 'buyer cannot confirm');
insert into ids select 'enr', id::text from public.course_enrollments where profile_id = auth.uid();

-- Organizer sees the enrollment and confirms
select pg_temp.act_as('org');
select is((select count(*)::int from public.course_enrollments where course_id = pg_temp.id('course')), 1, 'organizer sees enrollments');
select lives_ok($$ select public.confirm_enrollment(pg_temp.id('enr')) $$, 'organizer confirms payment');

select pg_temp.act_as('ana');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('course')), 3, 'all lessons after confirmation');
select is((select notes from public.course_lessons where id = pg_temp.id('l2')), 'Skrivne beležke', 'notes visible with access');
select lives_ok($$ select public.set_lesson_done(pg_temp.id('l2'), true) $$, 'mark lesson done');
select is((select count(*)::int from public.lesson_progress where done), 1, 'progress stored');
select public.set_lesson_done(pg_temp.id('l2'), false);
select is((select count(*)::int from public.lesson_progress where done), 0, 'undo marks not done (no delete)');
select public.set_lesson_done(pg_temp.id('l2'), true);
select is((select count(*)::int from public.notifications where kind = 'course' and title like 'Tečaj je odklenjen%'), 1, 'buyer notified');

-- Another user cannot see Ana's data or locked lessons
select pg_temp.act_as('bor');
select is((select count(*)::int from public.course_enrollments), 0, 'others cannot see enrollments');
select is((select count(*)::int from public.lesson_progress), 0, 'others cannot see progress');
select throws_ok($$ select public.add_lesson(pg_temp.id('course'), 'Vdor', null, null, false) $$, '42501', 'not_allowed', 'outsider cannot add lessons');

-- Removing a lesson hides it everywhere (soft remove)
select pg_temp.act_as('org');
select public.remove_lesson(pg_temp.id('l3'));
select is((select count(*)::int from public.course_outline(pg_temp.id('course'))), 2, 'removed lesson leaves the outline');
select pg_temp.act_as('ana');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('course')), 2, 'removed lesson not readable');
select throws_ok($$ select public.set_lesson_done(pg_temp.id('l3'), true) $$, '42501', 'not_allowed', 'no progress on a removed lesson');

-- Cancel removes access
select pg_temp.act_as('org');
select public.cancel_enrollment(pg_temp.id('enr'), 'Vračilo po dogovoru');
select pg_temp.act_as('ana');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('course')), 1, 'access revoked after cancel');

-- Free course: immediate access
select pg_temp.act_as('org');
with c as (insert into public.courses (space_id, slug, title, created_by)
  values (pg_temp.id('space'), 'brezplacen-pgtap', 'Brezplačen', auth.uid()) returning id)
insert into ids select 'free', id::text from c;
select public.add_lesson(pg_temp.id('free'), 'Edina', 'ccccccccccc', null, false);
update public.courses set status = 'published' where id = pg_temp.id('free');
select pg_temp.act_as('bor');
select is(public.enroll_course(pg_temp.id('free')), 'active', 'free course opens immediately');
select is((select count(*)::int from public.course_lessons where course_id = pg_temp.id('free')), 1, 'free course lessons visible after enrolling');

select * from finish();
rollback;

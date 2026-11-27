-- M10: uploaded course videos — only the space admin uploads into the course folder; watching follows lesson access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
insert into ids values ('org', pg_temp.mk_user('vid_org')::text), ('ana', pg_temp.mk_user('vid_ana')::text),
  ('bor', pg_temp.mk_user('vid_bor')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Video studio', 'video-studio-pgtap')::text);
with c as (insert into public.courses (space_id, slug, title, created_by)
  values (pg_temp.id('space'), 'video-tecaj-pgtap', 'Video tečaj', auth.uid()) returning id)
insert into ids select 'course', id::text from c;
insert into ids values ('p1', pg_temp.id('course')::text || '/prev12345.mp4'), ('p2', pg_temp.id('course')::text || '/lock12345.mp4');
select public.add_lesson(pg_temp.id('course'), 'Predogled', null, null, true, (select id from ids where name = 'p1'));
select public.add_lesson(pg_temp.id('course'), 'Zaklenjena', null, null, false, (select id from ids where name = 'p2'));
select throws_ok($$ select public.add_lesson(pg_temp.id('course'), 'Tuja mapa', null, null, false,
  '11111111-1111-1111-1111-111111111111/abcdefgh.mp4') $$, 'P0001', 'invalid_video', 'video must be in the course folder');
select throws_ok($$ select public.add_lesson(pg_temp.id('course'), 'Oboje', 'dQw4w9WgXcQ', null, false,
  (select id from ids where name = 'p1')) $$, '23514', null, 'either YouTube or an upload, not both');
select lives_ok($$ update public.courses set status = 'published' where id = pg_temp.id('course') $$,
  'uploaded videos count for publishing');

-- Upload rights (storage policy check expressions)
select ok(public.is_space_role(public.course_space(public.course_video_course((select id from ids where name = 'p2'))), 'admin'),
  'organizer may upload into the course folder');
select pg_temp.act_as('bor');
select ok(not coalesce(public.is_space_role(public.course_space(public.course_video_course((select id from ids where name = 'p2'))), 'admin'), false),
  'others may not upload');
select is(public.course_video_course('../../etc/passwd'), null, 'bad folder names give no course');

-- Watching
select pg_temp.act_anon();
select ok(public.can_watch_course_video((select id from ids where name = 'p1')), 'guests may watch the preview video');
select ok(not public.can_watch_course_video((select id from ids where name = 'p2')), 'guests may not watch locked videos');
select pg_temp.act_as('ana');
select public.enroll_course(pg_temp.id('course'));
select ok(public.can_watch_course_video((select id from ids where name = 'p2')), 'enrolled learner may watch');
select pg_temp.act_as('bor');
select ok(not public.can_watch_course_video((select id from ids where name = 'p2')), 'not-enrolled user may not watch');

select * from finish();
rollback;

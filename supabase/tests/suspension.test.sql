-- M9: space suspension hides the space and its content from the public and blocks new orders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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
insert into ids values ('org', pg_temp.mk_user('sus_org')::text), ('ana', pg_temp.mk_user('sus_ana')::text),
  ('adm', pg_temp.mk_user('sus_adm')::text), ('mod', pg_temp.mk_user('sus_mod')::text);
select pg_temp.act_root();
insert into public.platform_roles (profile_id, role) values (pg_temp.id('adm'), 'admin'), (pg_temp.id('mod'), 'moderator');

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Blokirani studio', 'blokirani-studio-pgtap')::text);
with e as (insert into public.events (space_id, created_by, slug, title)
  values (pg_temp.id('space'), auth.uid(), 'blok-dogodek-pgtap', 'Blok dogodek') returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select public.publish_event(pg_temp.id('event'));
with c as (insert into public.courses (space_id, slug, title, created_by)
  values (pg_temp.id('space'), 'blok-tecaj-pgtap', 'Blok tečaj', auth.uid()) returning id)
insert into ids select 'course', id::text from c;
select public.add_lesson(pg_temp.id('course'), 'Uvod', 'dQw4w9WgXcQ', null, true);
update public.courses set status = 'published' where id = pg_temp.id('course');

-- Only platform admins may suspend
select pg_temp.act_as('mod');
select throws_ok($$ select public.admin_set_space_suspension(pg_temp.id('space'), true, 'Prevara') $$,
  '42501', 'not_allowed', 'moderators cannot suspend spaces');
select pg_temp.act_as('org');
select throws_ok($$ select public.admin_set_space_suspension(pg_temp.id('space'), true, 'x') $$,
  '42501', 'not_allowed', 'owners cannot suspend');
select throws_ok($$ update public.spaces set suspended_at = now() where id = pg_temp.id('space') $$,
  '42501', null, 'no direct writes to suspension columns');

select pg_temp.act_as('adm');
select throws_ok($$ select public.admin_set_space_suspension(pg_temp.id('space'), true, '  ') $$,
  'P0001', 'reason_required', 'reason required');
select lives_ok($$ select public.admin_set_space_suspension(pg_temp.id('space'), true, 'Zavajajoče ponudbe') $$, 'admin suspends');

-- Public view
select pg_temp.act_anon();
select is((select count(*)::int from public.spaces where id = pg_temp.id('space')), 0, 'space hidden from guests');
select is((select count(*)::int from public.events where id = pg_temp.id('event')), 0, 'events hidden');
select is((select count(*)::int from public.courses where id = pg_temp.id('course')), 0, 'courses hidden');
select pg_temp.act_as('ana');
select throws_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'P0001', null,
  'no bookings in a suspended space');
select throws_ok($$ select public.enroll_course(pg_temp.id('course')) $$, 'P0001', null, 'no course orders');

-- Team still sees it with the reason; owner notified
select pg_temp.act_as('org');
select is((select suspended_reason from public.spaces where id = pg_temp.id('space')), 'Zavajajoče ponudbe', 'team sees the reason');
select is((select count(*)::int from public.notifications where title like 'Prostor je blokiran%'), 1, 'owner notified');

-- Unsuspend restores everything
select pg_temp.act_as('adm');
select public.admin_set_space_suspension(pg_temp.id('space'), false, 'Urejeno');
select pg_temp.act_as('ana');
select is((select count(*)::int from public.events where id = pg_temp.id('event')), 1, 'events visible again');
select lives_ok($$ select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1) $$, 'booking works again');

-- Overviews: staff only; user overview audited
select pg_temp.act_as('ana');
select throws_ok($$ select public.admin_user_overview(pg_temp.id('org')) $$, '42501', 'not_allowed', 'users cannot read overviews');
select throws_ok($$ select public.admin_space_overview(pg_temp.id('space')) $$, '42501', 'not_allowed', 'users cannot read space overview');
select pg_temp.act_as('adm');
select is((select public.admin_user_overview(pg_temp.id('org'))->>'email'), 'sus_org@example.test', 'admin sees e-mail');
select is((select (public.admin_space_overview(pg_temp.id('space'))->>'events_published')::int), 1, 'space overview counts');

select * from finish();
rollback;

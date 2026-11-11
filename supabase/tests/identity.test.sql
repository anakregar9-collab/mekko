-- RLS / authorization tests: profiles, interests, consents, data requests, admin status changes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- helpers -------------------------------------------------------------------
create function pg_temp.mk_user(p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_email, 'authenticated', 'authenticated', '{}'::jsonb)
  returning id;
$$;
create function pg_temp.affected(p_sql text) returns int language plpgsql as $f$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $f$;
create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.act_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;

create temp table ids (name text primary key, id uuid);
grant select on ids to anon, authenticated;
insert into ids values
  ('alice', pg_temp.mk_user('alice@example.test')),
  ('bob', pg_temp.mk_user('bob@example.test')),
  ('carol', pg_temp.mk_user('carol@example.test')),
  ('dave', pg_temp.mk_user('dave@example.test'));

update public.profiles set visibility = 'public', handle = 'alice' where id = (select id from ids where name = 'alice');
update public.profiles set handle = 'bob' where id = (select id from ids where name = 'bob');
update public.profiles set visibility = 'private', handle = 'carol' where id = (select id from ids where name = 'carol');
update public.profiles set handle = 'dave' where id = (select id from ids where name = 'dave');
insert into public.platform_roles (profile_id, role) select id, 'admin' from ids where name = 'dave';

-- signup trigger ----------------------------------------------------------------
select is((select count(*)::int from public.profiles where id in (select id from ids)), 4, 'signup trigger creates a profile per user');
select is((select display_name from public.profiles where id = (select id from ids where name = 'bob')), 'Nov uporabnik',
  'default display name never derived from email');

-- visibility --------------------------------------------------------------------
select pg_temp.act_anon();
select is((select array_agg(handle order by handle) from public.profiles), array['alice'], 'anon sees only public profiles');
select throws_ok($$ select bio from public.profiles where handle = 'alice' and onboarded_at is null $$, '42501', null,
  'anon cannot read non-public columns');
select throws_ok($$ select count(*) from public.user_consents $$, '42501', null, 'anon cannot read consents');

select pg_temp.act_as((select id from ids where name = 'bob'));
select is((select array_agg(handle order by handle) from public.profiles where handle in ('alice', 'bob', 'carol', 'dave')),
  array['alice', 'bob', 'dave'], 'members-visibility profiles visible to signed-in users; private hidden');

select pg_temp.act_as((select id from ids where name = 'carol'));
select is((select count(*)::int from public.profiles where handle = 'carol'), 1, 'private user sees self');

select pg_temp.act_as((select id from ids where name = 'dave'));
select is((select count(*)::int from public.profiles where handle = 'carol'), 1, 'platform staff can see private profile');

-- updates -----------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'bob'));
select is(pg_temp.affected($q$ update public.profiles set display_name = 'Hekerski Bob' where handle = 'alice' $q$), 0, 'cannot update someone else''s profile');
select is(pg_temp.affected($q$ update public.profiles set display_name = 'Bob B.' where handle = 'bob' $q$), 1, 'can update own profile');
select throws_ok($$ update public.profiles set status = 'active' where handle = 'bob' $$, '42501', null,
  'cannot change own account status');
select throws_ok($$ update public.profiles set handle = 'alice' where handle = 'bob' $$, '23505', null,
  'handles are unique');
select throws_ok($$ update public.profiles set handle = 'Bo B!' where handle = 'bob' $$, '23514', null,
  'handle format enforced');

-- interests ---------------------------------------------------------------------
select lives_ok($$ select public.set_my_interests((select array_agg(id) from public.interests where slug in ('keramika', 'ples'))) $$,
  'user sets own interests');
select is((select count(*)::int from public.profile_interests), 2, 'user sees only own interests');
select throws_ok($$ insert into public.profile_interests (profile_id, interest_id) values ((select id from ids where name = 'alice'), 1) $$,
  '42501', null, 'cannot write interests directly');

-- consents ----------------------------------------------------------------------
select lives_ok($$ insert into public.user_consents (profile_id, kind, granted) values ((select id from ids where name = 'bob'), 'approx_location', true) $$,
  'user records own consent');
select throws_ok($$ insert into public.user_consents (profile_id, kind, granted) values ((select id from ids where name = 'alice'), 'marketing_email', true) $$,
  '42501', null, 'cannot record consent for someone else');

-- data requests -----------------------------------------------------------------
select lives_ok($$ insert into public.data_requests (profile_id, kind) values ((select id from ids where name = 'bob'), 'export') $$,
  'user files a data export request');
select throws_ok($$ insert into public.data_requests (profile_id, kind) values ((select id from ids where name = 'bob'), 'export') $$,
  '23505', null, 'only one open request per kind');
select throws_ok($$ insert into public.data_requests (profile_id, kind, status) values ((select id from ids where name = 'bob'), 'deletion', 'done') $$,
  '42501', null, 'user cannot set request status');

-- audit log ---------------------------------------------------------------------
select throws_ok($$ insert into public.admin_audit_log (action, target_type, target_id) values ('x', 'y', 'z') $$,
  '42501', null, 'audit log is not writable by users');
select is((select count(*)::int from public.admin_audit_log), 0, 'non-admin sees no audit entries (RLS)');

-- admin status changes ------------------------------------------------------------
select throws_ok($$ select public.admin_set_profile_status((select id from ids where name = 'alice'), 'suspended', 'spam') $$,
  '42501', null, 'non-admin cannot suspend');

select pg_temp.act_as((select id from ids where name = 'dave'));
select throws_ok($$ select public.admin_set_profile_status((select id from ids where name = 'bob'), 'suspended', '') $$,
  'P0001', 'reason_required', 'suspension requires a reason');
select lives_ok($$ select public.admin_set_profile_status((select id from ids where name = 'bob'), 'suspended', 'Ponavljajoč spam') $$,
  'admin suspends user with reason');
select is((select count(*)::int from public.admin_audit_log where action = 'profile.set_status'
  and target_id = (select id from ids where name = 'bob')::text and reason = 'Ponavljajoč spam'), 1, 'suspension is audited');

select pg_temp.act_as((select id from ids where name = 'bob'));
select is(pg_temp.affected($q$ update public.profiles set bio = 'zdaj' where handle = 'bob' $q$), 0, 'suspended user cannot edit profile');

select * from finish();
rollback;

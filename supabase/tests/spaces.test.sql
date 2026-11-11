-- RLS / authorization tests: spaces and team roles, including cross-tenant isolation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

create function pg_temp.mk_user(p_handle text) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle where id = v;
  return v;
end $$;
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

create temp table ids (name text primary key, id uuid);
grant select, insert on ids to authenticated, anon;
insert into ids values
  ('owner', pg_temp.mk_user('owner')),
  ('adminx', pg_temp.mk_user('adminx')),
  ('staffer', pg_temp.mk_user('staffer')),
  ('outsider', pg_temp.mk_user('outsider')),
  ('other', pg_temp.mk_user('other'));

-- create ------------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'owner'));
select lives_ok($$ insert into ids values ('glina', public.create_space('studio', 'Glinena hiša', 'glinena-hisa', 'Ljubljana')) $$,
  'user creates a studio space');
select is((select role::text || '/' || status::text from public.space_members where space_id = (select id from ids where name = 'glina')),
  'owner/active', 'creator becomes the active owner');
select throws_ok($$ select public.create_space('community', 'Slaba', 'Slab Slug!') $$, '23514', null, 'slug format enforced');
select throws_ok($$ select public.create_space('community', 'Podvojena', 'glinena-hisa') $$, '23505', null, 'slugs are unique');
select throws_ok($$ insert into public.spaces (kind, name, slug, created_by) values ('studio', 'Mimo', 'mimo', auth.uid()) $$,
  '42501', null, 'spaces cannot be inserted directly');
insert into ids values ('krozek', public.create_space('community', 'Krožek', 'krozek'));
select is((select membership_mode::text from public.spaces where id = (select id from ids where name = 'krozek')),
  'open', 'communities default to open membership');

-- invites -----------------------------------------------------------------------
select lives_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'adminx', 'admin') $$,
  'owner invites an admin');
select throws_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'adminx', 'admin') $$,
  'P0001', 'already_member', 'duplicate invite rejected');
select throws_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'nihce', 'staff') $$,
  'P0002', 'user_not_found', 'unknown handle rejected');

select pg_temp.act_as((select id from ids where name = 'adminx'));
select ok(not public.is_space_role((select id from ids where name = 'glina'), 'admin'), 'pending invite grants nothing');
select is((select status::text from public.space_members where profile_id = auth.uid()), 'pending', 'invitee sees own invite');
select lives_ok($$ select public.respond_space_invite((select id from ids where name = 'glina'), true) $$, 'invitee accepts');
select ok(public.is_space_role((select id from ids where name = 'glina'), 'admin'), 'accepted invite grants admin');

select lives_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'staffer', 'staff') $$,
  'admin invites staff');
select throws_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'outsider', 'admin') $$,
  '42501', null, 'admin cannot invite another admin');
select throws_ok($$ select public.set_space_member_role((select id from ids where name = 'glina'), (select id from ids where name = 'staffer'), 'admin') $$,
  '42501', null, 'admin cannot change roles');

-- edits -------------------------------------------------------------------------
select is(pg_temp.affected($q$ update public.spaces set tagline = 'Glina za vse' where slug = 'glinena-hisa' $q$),
  1, 'admin edits space');
select throws_ok($$ update public.spaces set verification_status = 'verified' where slug = 'glinena-hisa' $$, '42501', null,
  'admin cannot self-verify');
select throws_ok($$ update public.spaces set slug = 'nova' where slug = 'glinena-hisa' $$, '42501', null,
  'slug is not editable via API');

-- cross-tenant ------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'outsider'));
select is(pg_temp.affected($q$ update public.spaces set name = 'Ugrabljeno' where slug = 'glinena-hisa' $q$),
  0, 'outsider cannot edit space');
select is((select count(*)::int from public.space_members where space_id = (select id from ids where name = 'glina')),
  0, 'outsider cannot list team');
select throws_ok($$ select public.invite_space_member((select id from ids where name = 'glina'), 'other', 'staff') $$,
  '42501', null, 'outsider cannot invite');

select pg_temp.act_as((select id from ids where name = 'other'));
select lives_ok($$ insert into ids values ('tuje', public.create_space('association', 'Društvo', 'drustvo')) $$,
  'other user creates own space');
select is(pg_temp.affected($q$ update public.spaces set name = 'X' where slug = 'glinena-hisa' $q$),
  0, 'owner of another space cannot edit this one');

select pg_temp.act_as((select id from ids where name = 'owner'));
select is(pg_temp.affected($q$ update public.spaces set name = 'X' where slug = 'drustvo' $q$),
  0, 'and vice versa');

-- roles and removal ---------------------------------------------------------------
select throws_ok($$ select public.remove_space_member((select id from ids where name = 'glina'), auth.uid()) $$,
  'P0001', 'cannot_remove_owner', 'owner cannot be removed');
select lives_ok($$ select public.remove_space_member((select id from ids where name = 'glina'), (select id from ids where name = 'adminx')) $$,
  'owner removes admin');

reset role;
select throws_ok($$ insert into public.space_members (space_id, profile_id, role, status)
  values ((select id from ids where name = 'glina'), (select id from ids where name = 'outsider'), 'owner', 'active') $$,
  '23505', null, 'a space has exactly one active owner');

-- suspension revokes organizer powers --------------------------------------------
update public.profiles set status = 'suspended' where handle = 'owner';
select pg_temp.act_as((select id from ids where name = 'owner'));
select is(pg_temp.affected($q$ update public.spaces set name = 'Y' where slug = 'glinena-hisa' $q$),
  0, 'suspended owner cannot edit');

-- anon --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('role', 'anon', true);
select throws_ok($$ select count(*) from public.space_members $$, '42501', null, 'anon cannot read memberships');

select * from finish();
rollback;

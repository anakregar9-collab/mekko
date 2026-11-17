-- Feed: follows (private approval), post visibility, blocks, likes, comments, limits, moderation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;
create function pg_temp.mk_user(p_handle text, p_vis text default 'members') returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, onboarded_at = now(), visibility = p_vis::public.profile_visibility where id = v;
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
create function pg_temp.ph(p_name text) returns text[] language sql as $$
  select array[(select id from ids where name = p_name) || '/abcdefgh12.jpg'] $$;

insert into ids values ('ana', pg_temp.mk_user('feed_ana')::text), ('bor', pg_temp.mk_user('feed_bor')::text),
  ('zasebna', pg_temp.mk_user('feed_zasebna', 'private')::text), ('mod', pg_temp.mk_user('feed_mod')::text);
insert into public.platform_roles (profile_id, role) values (pg_temp.id('mod'), 'moderator');

-- Posting rules ------------------------------------------------------------------------
select pg_temp.act_as('ana');
select throws_ok($$ select public.create_post('Vaza', 'public', pg_temp.ph('ana'), false) $$, 'P0001',
  'children_confirmation_required', 'posting requires the no-children confirmation');
select throws_ok($$ select public.create_post('Brez slike', 'public', array[]::text[], true) $$, 'P0001',
  'photos_required', 'a post needs 1–5 photos');
select throws_ok($$ select public.create_post('Tuja slika', 'public', pg_temp.ph('bor'), true) $$, '42501', null,
  'cannot attach photos from someone else''s folder');
insert into ids select 'pub', public.create_post('Moja prva vaza', 'public', pg_temp.ph('ana'), true)::text;
insert into ids select 'fol', public.create_post('Samo za sledilce', 'followers', pg_temp.ph('ana'), true)::text;
select throws_ok($$ insert into public.posts (author_id, caption) values (auth.uid(), 'mimo') $$, '42501', null,
  'no direct inserts into posts');

-- Visibility ----------------------------------------------------------------------------
select pg_temp.act_anon();
select throws_ok($$ select count(*) from public.posts $$, '42501', null, 'guests cannot read posts');
select pg_temp.act_as('bor');
select is((select count(*)::int from public.feed_posts('all') where author_id = pg_temp.id('ana')), 1,
  'signed-in users see public posts only');
select is(public.follow_user(pg_temp.id('ana')), 'active', 'following a normal profile is instant');
select is((select count(*)::int from public.feed_posts('following')), 2, 'followers see followers-only posts too');
select is((select count(*)::int from public.posts where author_id = pg_temp.id('ana')), 2, 'RLS agrees with the feed');

-- Private profile needs approval.
select is(public.follow_user(pg_temp.id('zasebna')), 'pending', 'following a private profile is a request');
select pg_temp.act_as('zasebna');
insert into ids select 'priv', public.create_post('Zasebno', 'public', pg_temp.ph('zasebna'), true)::text;
select pg_temp.act_as('bor');
select is((select count(*)::int from public.posts where id = pg_temp.id('priv')), 0, 'pending followers see nothing');
select pg_temp.act_as('zasebna');
select public.respond_follow(pg_temp.id('bor'), true);
select pg_temp.act_as('bor');
select is((select count(*)::int from public.posts where id = pg_temp.id('priv')), 1, 'approved followers see private posts');

-- Likes and comments --------------------------------------------------------------------
select is(public.toggle_like(pg_temp.id('pub')), true, 'like');
select is(public.toggle_like(pg_temp.id('pub')), false, 'unlike');
select public.toggle_like(pg_temp.id('pub'));
insert into ids select 'com', public.add_comment(pg_temp.id('pub'), 'Čudovito!')::text;
select is((select like_count from public.feed_posts('single', pg_temp.id('pub'))), 1, 'like count');
select is((select comment_count from public.feed_posts('single', pg_temp.id('pub'))), 1, 'comment count');
select throws_ok($$ select public.add_comment(pg_temp.id('pub'), '   ') $$, 'P0001', 'invalid_comment', 'empty comments rejected');

-- Post author may remove comments on their post.
select pg_temp.act_as('ana');
select lives_ok($$ select public.remove_comment((select id::bigint from ids where name = 'com')) $$,
  'post author removes a comment');

-- Blocks hide posts and end follows.
select public.block_user(pg_temp.id('bor'));
select pg_temp.act_as('bor');
select is((select count(*)::int from public.posts where author_id = pg_temp.id('ana')), 0, 'blocked users see no posts');
select is((select count(*)::int from public.follows where followee_id = pg_temp.id('ana')), 0, 'block ends the follow');
select throws_ok($$ select public.toggle_like(pg_temp.id('pub')) $$, 'P0001', 'post_not_found', 'blocked users cannot like');

-- Moderation ----------------------------------------------------------------------------
select pg_temp.act_as('mod');
select lives_ok($$ select public.admin_set_post_status(pg_temp.id('pub'), 'hidden', 'Prepoznaven otrok na fotografiji') $$,
  'moderator hides a post');
select pg_temp.act_as('zasebna');
select is((select count(*)::int from public.posts where id = pg_temp.id('pub')), 0, 'hidden posts disappear for others');

-- Rate limit.
select pg_temp.act_root();
insert into public.posts (author_id, caption) select pg_temp.id('bor'), 'spam ' || g from generate_series(1, 20) g;
select pg_temp.act_as('bor');
select throws_ok($$ select public.create_post('Še ena', 'public', pg_temp.ph('bor'), true) $$, 'P0001', 'rate_limited',
  'max 20 posts per day');

select * from finish();
rollback;

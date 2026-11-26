-- Feed notifications (like/comment/follow, no self, deduped) and people search.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;
create function pg_temp.mk_user(p_handle text, p_name text, p_vis text default 'members') returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, display_name = p_name, onboarded_at = now(),
    visibility = p_vis::public.profile_visibility where id = v;
  return v;
end $$;
create function pg_temp.act_as(p_name text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from ids where name = p_name), 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('ana', pg_temp.mk_user('soc_ana', 'Ana Socialna')::text),
  ('bor', pg_temp.mk_user('soc_bor', 'Bor Bralec')::text),
  ('zas', pg_temp.mk_user('soc_zas', 'Zala Zasebna', 'private')::text);

select pg_temp.act_as('ana');
insert into ids select 'post', public.create_post('Vaza', 'public', array[pg_temp.id('ana') || '/abcdefgh12.jpg'], true)::text;
select public.toggle_like(pg_temp.id('post'));  -- own like: no notification

select pg_temp.act_as('bor');
select public.follow_user(pg_temp.id('ana'));
select public.toggle_like(pg_temp.id('post'));
select public.toggle_like(pg_temp.id('post'));  -- unlike
select public.toggle_like(pg_temp.id('post'));  -- like again: deduped
select public.add_comment(pg_temp.id('post'), 'Lepo!');
select public.follow_user(pg_temp.id('zas'));

select pg_temp.act_as('ana');
select is((select count(*)::int from public.notifications where kind = 'social_like'), 1, 'one like notification (deduped, none for own like)');
select is((select count(*)::int from public.notifications where kind = 'social_comment'), 1, 'comment notifies the post author');
select is((select title from public.notifications where kind = 'social_follow'), 'Bor Bralec ti sledi', 'new follower is notified');

select pg_temp.act_as('zas');
select is((select title from public.notifications where kind = 'social_follow'), 'Prošnja za sledenje', 'private profile gets a request');
select public.respond_follow(pg_temp.id('bor'), true);
select pg_temp.act_as('bor');
select is((select count(*)::int from public.notifications where title like '%sprejel/-a tvojo prošnjo'), 1, 'accepted request notifies the follower');

-- Search
select is((select count(*)::int from public.search_people('soc_')), 3, 'search by handle');
select is((select count(*)::int from public.search_people('Zala') where handle = 'soc_zas'), 1, 'search by name finds private profiles too (follow needs approval)');
select is((select count(*)::int from public.search_people('a')), 0, 'at least 2 characters');
select pg_temp.act_as('ana');
select public.block_user(pg_temp.id('bor'));
select is((select count(*)::int from public.search_people('Bor Bralec')), 0, 'blocked people do not appear');

select * from finish();
rollback;

-- Idea likes, ratings, comments: rules, counts, notifications, blocks, reports.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;
create function pg_temp.mk_user(p_handle text, p_name text) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, display_name = p_name, onboarded_at = now() where id = v;
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
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('ana', pg_temp.mk_user('ie_ana', 'Ana Avtorica')::text),
  ('bor', pg_temp.mk_user('ie_bor', 'Bor Bralec')::text), ('cene', pg_temp.mk_user('ie_cene', 'Cene')::text);
select pg_temp.act_as('ana');
with i as (insert into public.ideas (author_id, slug, title, body)
  values (auth.uid(), 'ie-ideja-pgtap', 'Origami', 'Dovolj dolga navodila za test.') returning id)
insert into ids select 'idea', id::text from i;
select throws_ok($$ select public.rate_idea(pg_temp.id('idea'), 5) $$, 'P0001', 'cannot_rate_own', 'authors cannot rate their own idea');

select pg_temp.act_as('bor');
select is(public.toggle_idea_like(pg_temp.id('idea')), true, 'like');
select public.toggle_idea_like(pg_temp.id('idea'));
select public.toggle_idea_like(pg_temp.id('idea'));
select throws_ok($$ select public.rate_idea(pg_temp.id('idea'), 6) $$, 'P0001', 'invalid_rating', 'ratings are 1–5');
select lives_ok($$ select public.rate_idea(pg_temp.id('idea'), 4) $$, 'rate');
select lives_ok($$ select public.rate_idea(pg_temp.id('idea'), 5) $$, 'change own rating');
insert into ids select 'com', public.add_idea_comment(pg_temp.id('idea'), 'Kako velik naj bo papir?')::text;
select pg_temp.act_as('cene');
select public.rate_idea(pg_temp.id('idea'), 3);

select pg_temp.act_anon();
select is((select rating_avg from public.idea_stats(array[pg_temp.id('idea')])), 4.0, 'guests see the average (5 and 3)');
select is((select rating_count from public.idea_stats(array[pg_temp.id('idea')])), 2, 'one rating per person');
select is((select like_count from public.idea_stats(array[pg_temp.id('idea')])), 1, 'like count');
select throws_ok($$ select count(*) from public.idea_comments $$, '42501', null, 'guests cannot read comments');

select pg_temp.act_as('ana');
select is((select count(*)::int from public.notifications where kind = 'idea_activity'), 4,
  'author notified: 1 like (deduped), 2 first ratings, 1 comment');
select lives_ok($$ select public.remove_idea_comment((select id::bigint from ids where name = 'com')) $$,
  'idea author removes a comment');

select pg_temp.act_as('cene');
select throws_ok($$ select public.report_content('idea_comment', '999999', 'spam') $$, 'P0001', 'report_target_not_found',
  'cannot report missing comments');
select pg_temp.act_as('ana');
select public.block_user(pg_temp.id('cene'));
select pg_temp.act_as('cene');
select throws_ok($$ select public.toggle_idea_like(pg_temp.id('idea')) $$, 'P0001', 'idea_not_found',
  'blocked users cannot interact');
select throws_ok($$ insert into public.idea_likes (idea_id, profile_id) values (pg_temp.id('idea'), auth.uid()) $$,
  '42501', null, 'no direct writes');

select * from finish();
rollback;

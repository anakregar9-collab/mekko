-- Ideas: publish, preview for guests, author-only edits, moderation, saves, reports.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;
create function pg_temp.mk_user(p_handle text) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, onboarded_at = now(), visibility = 'private' where id = v;
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

insert into ids values ('ana', pg_temp.mk_user('idea_ana')::text), ('bor', pg_temp.mk_user('idea_bor')::text),
  ('mod', pg_temp.mk_user('idea_mod')::text);
insert into public.platform_roles (profile_id, role) values (pg_temp.id('mod'), 'moderator');

select pg_temp.act_as('ana');
select throws_ok($$ insert into public.ideas (author_id, slug, title, body) values (auth.uid(), 'kratko-pgtap', 'Kratko', 'prekratko') $$,
  '23514', null, 'instructions need at least 20 characters');
with i as (
  insert into public.ideas (author_id, slug, title, summary, body, materials, external_url, beginner_friendly)
  values (auth.uid(), 'origami-zerjav-pgtap', 'Origami žerjav', 'Prepogni svojega prvega žerjava.',
          E'1. Vzemi kvadraten list.\n2. Prepogni po diagonali.\n3. Nadaljuj po korakih.', 'Kvadraten papir',
          'https://example.org/origami', true)
  returning id)
insert into ids select 'idea', id::text from i;
select is((select status from public.ideas where id = pg_temp.id('idea')), 'published', 'new ideas are published');
select throws_ok($$ insert into public.ideas (author_id, slug, title, body) values (pg_temp.id('bor'), 'ponaredek-pgtap', 'Ponaredek', 'Ta ideja se pretvarja, da je od Bora.') $$,
  '42501', null, 'cannot publish in someone else''s name');
select throws_ok($$ update public.ideas set status = 'hidden' where id = pg_temp.id('idea') $$, '42501', null,
  'authors cannot change moderation status');

-- Guests: preview only, author name visible even for private profiles.
select pg_temp.act_anon();
select is((select title from public.ideas where id = pg_temp.id('idea')), 'Origami žerjav', 'guests see the preview');
select throws_ok($$ select body from public.ideas where id = pg_temp.id('idea') $$, '42501', null,
  'guests cannot read the instructions');
select is((select display_name from public.idea_authors(array[pg_temp.id('idea')])), 'Nov uporabnik',
  'author name is public for published ideas');

-- Other users.
select pg_temp.act_as('bor');
select ok((select body from public.ideas where id = pg_temp.id('idea')) like '1. Vzemi%', 'signed-in users read the instructions');
select is((select count(*)::int from public.ideas where id = pg_temp.id('idea') and title = 'Spremenjeno'), 0, 'precondition');
update public.ideas set title = 'Spremenjeno' where id = pg_temp.id('idea');
select is((select title from public.ideas where id = pg_temp.id('idea')), 'Origami žerjav', 'others cannot edit');
select lives_ok($$ insert into public.saved_ideas (profile_id, idea_id) values (auth.uid(), pg_temp.id('idea')) $$, 'bor saves the idea');
select lives_ok($$ select public.report_content('idea', (select id from ids where name = 'idea'), 'spam') $$, 'bor reports the idea');

-- Moderation.
select pg_temp.act_as('bor');
select throws_ok($$ select public.admin_set_idea_status(pg_temp.id('idea'), 'hidden', 'x') $$, '42501', null,
  'users cannot hide ideas');
select pg_temp.act_as('mod');
select lives_ok($$ select public.admin_set_idea_status(pg_temp.id('idea'), 'hidden', 'Kopija tuje vsebine') $$,
  'moderator hides the idea');
select pg_temp.act_as('bor');
select is((select count(*)::int from public.ideas where id = pg_temp.id('idea')), 0, 'hidden ideas disappear for others');
select pg_temp.act_as('ana');
select is((select hidden_reason from public.ideas where id = pg_temp.id('idea')), 'Kopija tuje vsebine',
  'author still sees own hidden idea and the reason');
select is((select count(*)::int from public.notifications where title = 'Ideja je skrita'), 1, 'author is notified');

select * from finish();
rollback;

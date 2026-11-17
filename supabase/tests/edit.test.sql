-- Editing: capacity guard, locked payment terms, only the team edits events, only authors edit ideas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('org', pg_temp.mk_user('ed_org')::text), ('ana', pg_temp.mk_user('ed_ana')::text),
  ('bor', pg_temp.mk_user('ed_bor')::text);
select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Urejanje', 'urejanje-pgtap')::text);
with e as (
  insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking)
  values (pg_temp.id('space'), auth.uid(), 'urejanje-pgtap-e', 'Urejanje', 6, 3) returning id)
insert into ids select 'event', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select public.publish_event(pg_temp.id('event'));
select pg_temp.act_as('ana');
select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 3);

select pg_temp.act_as('org');
select throws_ok($$ update public.events set capacity = 2 where id = pg_temp.id('event') $$, 'P0001',
  'capacity_below_bookings', 'capacity cannot drop below seats taken');
select lives_ok($$ update public.events set capacity = 3, title = 'Urejanje – posodobljeno', address = 'Nova 1, Ljubljana'
  where id = pg_temp.id('event') $$, 'organizer edits title, address and capacity down to the booked seats');
select is((select title from public.events where id = pg_temp.id('event')), 'Urejanje – posodobljeno', 'edit is saved');

select pg_temp.act_as('bor');
update public.events set title = 'Vdor' where id = pg_temp.id('event');
select is((select title from public.events where id = pg_temp.id('event')), 'Urejanje – posodobljeno',
  'outsiders cannot edit events');

-- Ideas: only the author edits; author cannot touch moderation fields.
select pg_temp.act_as('ana');
with i as (insert into public.ideas (author_id, slug, title, body)
  values (auth.uid(), 'urejanje-ideja-pgtap', 'Ideja', 'Dovolj dolga navodila za preizkus.') returning id)
insert into ids select 'idea', id::text from i;
select lives_ok($$ update public.ideas set title = 'Ideja v2', cover_image_path = null where id = pg_temp.id('idea') $$,
  'author edits own idea');
select pg_temp.act_as('bor');
update public.ideas set title = 'Ukradeno' where id = pg_temp.id('idea');
select is((select title from public.ideas where id = pg_temp.id('idea')), 'Ideja v2', 'others cannot edit ideas');
select pg_temp.act_as('ana');
select throws_ok($$ update public.ideas set status = 'hidden' where id = pg_temp.id('idea') $$, '42501', null,
  'authors cannot change moderation status');

select * from finish();
rollback;

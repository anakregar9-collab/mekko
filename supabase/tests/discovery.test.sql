-- seats_taken_many: one call for all discovery cards; never reveals members-only events to outsiders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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
create function pg_temp.id(p_name text) returns uuid language sql as $$ select id::uuid from ids where name = p_name $$;

insert into ids values ('org', pg_temp.mk_user('stm_org')::text), ('ana', pg_temp.mk_user('stm_ana')::text),
  ('out', pg_temp.mk_user('stm_out')::text);

select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('community', 'Štetje mest', 'stetje-mest-pgtap')::text);
update public.spaces set membership_mode = 'open' where id = pg_temp.id('space');
with e as (insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking)
  values (pg_temp.id('space'), auth.uid(), 'stm-javni-pgtap', 'Javni', 10, 3) returning id)
insert into ids select 'pub', id::text from e;
with e as (insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking, visibility)
  values (pg_temp.id('space'), auth.uid(), 'stm-clani-pgtap', 'Za člane', 10, 3, 'members') returning id)
insert into ids select 'mem', id::text from e;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('pub'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'pub_occ', id::text from o;
with o as (insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('mem'), now() + interval '3 days', now() + interval '3 days 2 hours') returning id)
insert into ids select 'mem_occ', id::text from o;
select public.publish_event(pg_temp.id('pub'));
select public.publish_event(pg_temp.id('mem'));

select pg_temp.act_as('ana');
select public.join_space(pg_temp.id('space'));
select public.book_event(pg_temp.id('pub'), pg_temp.id('pub_occ'), 2);
select public.book_event(pg_temp.id('mem'), pg_temp.id('mem_occ'), 3);

select is((select taken from public.seats_taken_many(array[pg_temp.id('pub')]) where occurrence_id = pg_temp.id('pub_occ')),
  2, 'counts confirmed seats per session');
select is((select taken from public.seats_taken_many(array[pg_temp.id('mem')])), 3, 'member sees members-only counts');
select is((select public.seats_taken(pg_temp.id('pub'), pg_temp.id('pub_occ'))),
  (select taken from public.seats_taken_many(array[pg_temp.id('pub')])), 'matches seats_taken');

select pg_temp.act_as('out');
select is((select count(*)::int from public.seats_taken_many(array[pg_temp.id('mem')])), 0,
  'outsider gets nothing for a members-only event');
select is((select count(*)::int from public.seats_taken_many(array[pg_temp.id('pub'), pg_temp.id('mem')])), 1,
  'outsider still gets the public event');

select pg_temp.act_anon();
select is((select taken from public.seats_taken_many(array[pg_temp.id('pub')])), 2, 'guests can read counts');

select * from finish();
rollback;

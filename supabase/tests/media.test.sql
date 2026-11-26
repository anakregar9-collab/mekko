-- Photo storage: own-folder uploads only, guests cannot upload, path format on events/ideas.
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
create function pg_temp.act_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;
create function pg_temp.v(p_name text) returns text language sql as $$ select id from ids where name = p_name $$;

insert into ids values ('ana', pg_temp.mk_user('media_ana')::text), ('bor', pg_temp.mk_user('media_bor')::text);

select ok((select public and 'image/webp' = any (allowed_mime_types) and file_size_limit = 5242880
           from storage.buckets where id = 'covers'), 'covers bucket: public, images only, 5 MB');

select pg_temp.act_as('ana');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', '%s/abcdefgh12.jpg', '%s') $$,
  pg_temp.v('ana'), pg_temp.v('ana')), 'users upload into their own folder');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', '%s/abcdefgh12.jpg', '%s') $$,
  pg_temp.v('bor'), pg_temp.v('ana')), '42501', null, 'users cannot upload into someone else''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('covers', 'skupno/abcdefgh12.jpg') $$,
  '42501', null, 'no uploads outside a user folder');

select pg_temp.act_anon();
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('covers', 'gost/abcdefgh12.jpg') $$,
  '42501', null, 'guests cannot upload');

select pg_temp.act_as('ana');
select throws_ok(format($$ insert into public.ideas (author_id, slug, title, body, cover_image_path)
  values ('%s', 'slika-pgtap', 'Slika', 'Dovolj dolga navodila za test.', '../../etc/passwd') $$, pg_temp.v('ana')),
  '23514', null, 'photo path format is enforced');
select lives_ok(format($$ insert into public.ideas (author_id, slug, title, body, cover_image_path)
  values ('%s', 'slika-ok-pgtap', 'Slika', 'Dovolj dolga navodila za test.', '%s/abcdefgh12.webp') $$,
  pg_temp.v('ana'), pg_temp.v('ana')), 'valid photo path is accepted');

select * from finish();
rollback;

-- Photos for events and ideas (founder: "nadaljuj" after ideas slice).
-- Public, non-paid content images in bucket "covers": anyone can view; signed-in users upload only into
-- their own folder "<user id>/…". Type and size are enforced by the bucket (JPEG/PNG/WebP, max 5 MB)
-- and the upload action additionally checks the file signature. Additive only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy covers_insert_own_folder on storage.objects for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

-- Path of the uploaded photo ("<uploader id>/<random>.<ext>"); null = colour placeholder.
alter table public.events add column cover_image_path text
  check (cover_image_path is null or cover_image_path ~ '^[0-9a-f-]{36}/[a-z0-9]{8,40}\.(jpg|png|webp)$');
alter table public.ideas add column cover_image_path text
  check (cover_image_path is null or cover_image_path ~ '^[0-9a-f-]{36}/[a-z0-9]{8,40}\.(jpg|png|webp)$');

grant select (cover_image_path) on public.events to anon, authenticated;
grant insert (cover_image_path), update (cover_image_path) on public.events to authenticated;
grant select (cover_image_path) on public.ideas to anon;
grant insert (cover_image_path), update (cover_image_path) on public.ideas to authenticated;

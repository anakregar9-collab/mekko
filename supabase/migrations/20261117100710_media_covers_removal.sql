-- Users may remove their own uploaded photos (kept separate from media_covers).
create policy covers_remove_own on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

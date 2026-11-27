-- M10 (founder 2026-11-26: "a mamo lahko oba načina"): a lesson's video is either a YouTube link or a video file
-- uploaded to Mekko. Uploaded videos live in the private bucket "course-videos" under "<course id>/…"; only the
-- space admins upload there, and a signed (temporary) link is created only for viewers with access to the lesson.
-- Additive only; no row deletes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-videos', 'course-videos', false, 524288000, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.course_lessons add column video_path text
  check (video_path is null or video_path ~ '^[0-9a-f-]{36}/[a-z0-9]{8,40}\.(mp4|webm|mov)$');
alter table public.course_lessons add constraint course_lessons_one_video
  check (youtube_id is null or video_path is null);
grant update (video_path) on public.course_lessons to authenticated;

-- "<course id>/file" → course id, or null when the folder is not a uuid.
create function public.course_video_course(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

-- May the caller watch this uploaded video? Same rule as reading the lesson.
create function public.can_watch_course_video(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.course_lessons l join public.courses c on c.id = l.course_id
    where l.video_path = p_name and l.removed_at is null
      and (public.has_course_access(c.id)
           or (l.is_preview and c.status = 'published' and public.is_space_live(c.space_id))));
$$;

create policy course_videos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-videos'
    and public.is_space_role(public.course_space(public.course_video_course(name)), 'admin')
  );
create policy course_videos_select on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'course-videos'
    and (public.can_watch_course_video(name)
         or public.is_space_role(public.course_space(public.course_video_course(name)), 'admin'))
  );

-- Publishing / removing: a lesson counts as having a video with either source.
create or replace function public.guard_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.space_id <> old.space_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.hidden_reason is distinct from old.hidden_reason and not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if new.status = 'published' and new.hidden_reason is not null and not public.is_moderator() then
    raise exception 'hidden_by_moderator' using errcode = 'P0001';
  end if;
  if new.price_cents is not null and (select legal_form from public.spaces where id = new.space_id) is null then
    raise exception 'legal_info_required' using errcode = 'P0001';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from public.course_lessons where course_id = new.id and removed_at is null
                   and (youtube_id is not null or video_path is not null)) then
      raise exception 'course_needs_lessons' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

create or replace function public.course_outline(p_course uuid)
returns table (id uuid, position_no int, title text, is_preview boolean, has_video boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.position, l.title, l.is_preview, (l.youtube_id is not null or l.video_path is not null)
  from public.course_lessons l join public.courses c on c.id = l.course_id
  where l.course_id = p_course and l.removed_at is null
    and (c.status = 'published' or public.is_space_role(c.space_id, 'staff'))
  order by l.position, l.created_at;
$$;

create or replace function public.remove_lesson(p_lesson uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_l public.course_lessons;
begin
  select * into v_l from public.course_lessons where id = p_lesson and removed_at is null;
  if v_l.id is null or not public.is_space_role(public.course_space(v_l.course_id), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select status from public.courses where id = v_l.course_id) = 'published'
     and not exists (select 1 from public.course_lessons where course_id = v_l.course_id and id <> p_lesson
                     and (youtube_id is not null or video_path is not null) and removed_at is null) then
    raise exception 'course_needs_lessons' using errcode = 'P0001';
  end if;
  update public.course_lessons set removed_at = now() where id = p_lesson;
end $$;

-- Add a lesson with either a YouTube id or an uploaded video (path must be in this course's folder).
create function public.add_lesson(p_course uuid, p_title text, p_youtube_id text, p_notes text, p_preview boolean,
  p_video_path text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_space_role(public.course_space(p_course), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_video_path), '') is not null and public.course_video_course(p_video_path) is distinct from p_course then
    raise exception 'invalid_video' using errcode = 'P0001';
  end if;
  if (select count(*) from public.course_lessons where course_id = p_course and removed_at is null) >= 100 then
    raise exception 'too_many_lessons' using errcode = 'P0001';
  end if;
  insert into public.course_lessons (course_id, position, title, youtube_id, video_path, notes, is_preview)
  values (p_course, coalesce((select max(position) from public.course_lessons where course_id = p_course), 0) + 1,
    btrim(p_title), nullif(btrim(p_youtube_id), ''), nullif(btrim(p_video_path), ''), nullif(btrim(p_notes), ''),
    coalesce(p_preview, false))
  returning id into v_id;
  return v_id;
end $$;

-- An uploaded path set by update must also stay inside the course's own folder.
create function public.guard_lesson_video() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.video_path is not null and public.course_video_course(new.video_path) is distinct from new.course_id then
    raise exception 'invalid_video' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger course_lessons_video_guard before insert or update of video_path on public.course_lessons
  for each row execute function public.guard_lesson_video();

revoke execute on function public.can_watch_course_video(text), public.guard_lesson_video(),
  public.add_lesson(uuid, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.course_video_course(text), public.can_watch_course_video(text) to anon, authenticated;
grant execute on function public.add_lesson(uuid, text, text, text, boolean, text) to authenticated;
grant execute on all functions in schema public to service_role;

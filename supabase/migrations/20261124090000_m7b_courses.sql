-- M7b: recorded courses (founder 2026-11-23): may be paid; payment like passes (organizer's instructions or own
-- payment link, organizer confirms → access). Videos are YouTube links (Mekko stores only the video id).
-- Lesson video ids and notes are readable only with access (enrolled + confirmed, the space team, or a free
-- preview lesson); the outline (titles) is public through course_outline(). Additive only.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  summary text check (summary is null or char_length(summary) <= 200),
  description text check (description is null or char_length(description) <= 5000),
  interest_id smallint references public.interests (id),
  cover text not null default 'lilac' check (cover in ('coral', 'sun', 'sage', 'lilac', 'sky', 'clay')),
  price_cents int check (price_cents is null or price_cents between 50 and 500000),
  payment_instructions text check (payment_instructions is null or char_length(btrim(payment_instructions)) between 5 and 1000),
  payment_link text check (payment_link is null or (payment_link ~ '^https://[^\s]+$' and char_length(payment_link) <= 500)),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint courses_paid_needs_instructions check (price_cents is null or payment_instructions is not null)
);
create index courses_space_idx on public.courses (space_id);

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  notes text check (notes is null or char_length(notes) <= 5000),
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index course_lessons_course_idx on public.course_lessons (course_id, position);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('awaiting', 'active', 'cancelled')),
  price_cents int,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now()
);
create unique index course_enrollments_one_idx on public.course_enrollments (course_id, profile_id)
  where status <> 'cancelled';
create index course_enrollments_profile_idx on public.course_enrollments (profile_id);

create table public.lesson_progress (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow', 'idea_activity',
  'session_changed', 'waitlist_spot', 'reminder', 'community', 'pass', 'course'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.course_space(p_course uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select space_id from public.courses where id = p_course;
$$;

-- Full access to lessons: confirmed enrollment or the space team.
create function public.has_course_access(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_space_role(public.course_space(p_course), 'staff')
    or exists (select 1 from public.course_enrollments
               where course_id = p_course and profile_id = auth.uid() and status = 'active');
$$;

-- Guard: paid courses need the organizer's legal status; publishing needs at least one lesson with a video.
create function public.guard_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.space_id <> old.space_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if new.price_cents is not null and (select legal_form from public.spaces where id = new.space_id) is null then
    raise exception 'legal_info_required' using errcode = 'P0001';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from public.course_lessons where course_id = new.id and youtube_id is not null) then
      raise exception 'course_needs_lessons' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;
create trigger courses_guard before insert or update on public.courses
  for each row execute function public.guard_course();

-- Public outline: titles, positions and which lessons are free previews (no video ids).
create function public.course_outline(p_course uuid)
returns table (id uuid, position_no int, title text, is_preview boolean, has_video boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.position, l.title, l.is_preview, l.youtube_id is not null
  from public.course_lessons l join public.courses c on c.id = l.course_id
  where l.course_id = p_course
    and (c.status = 'published' or public.is_space_role(c.space_id, 'staff'))
  order by l.position, l.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Enrollment
-- ---------------------------------------------------------------------------
create function public.enroll_course(p_course uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.courses;
  v_status text;
  v_owner uuid;
  v_slug text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_c from public.courses where id = p_course and status = 'published';
  if v_c.id is null then
    raise exception 'course_not_available' using errcode = 'P0001';
  end if;
  if (select count(*) from public.course_enrollments where profile_id = auth.uid() and status = 'awaiting') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  v_status := case when v_c.price_cents is null then 'active' else 'awaiting' end;
  insert into public.course_enrollments (course_id, profile_id, status, price_cents, confirmed_at)
  values (p_course, auth.uid(), v_status, v_c.price_cents, case when v_status = 'active' then now() end);
  if v_status = 'awaiting' then
    select profile_id into v_owner from public.space_members where space_id = v_c.space_id and role = 'owner' and status = 'active';
    select slug into v_slug from public.spaces where id = v_c.space_id;
    if v_owner is not null then
      perform public.notify(v_owner, 'course', 'Nov nakup tečaja: ' || left(v_c.title, 80),
        (select display_name from public.profiles where id = auth.uid()) || ' čaka na potrditev plačila.',
        '/organizator/' || v_slug || '/tecaji/' || v_c.id);
    end if;
  end if;
  return v_status;
exception
  when unique_violation then
    raise exception 'already_enrolled' using errcode = 'P0001';
end $$;

create function public.withdraw_enrollment(p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.course_enrollments set status = 'cancelled', cancel_reason = 'Preklical/-a kupec.'
  where course_id = p_course and profile_id = auth.uid() and status = 'awaiting';
  if not found then
    raise exception 'enrollment_not_found' using errcode = 'P0002';
  end if;
end $$;

create function public.confirm_enrollment(p_enrollment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_e public.course_enrollments;
  v_c public.courses;
begin
  select * into v_e from public.course_enrollments where id = p_enrollment for update;
  select * into v_c from public.courses where id = v_e.course_id;
  if v_e.id is null or not public.is_space_role(v_c.space_id, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_e.status <> 'awaiting' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.course_enrollments set status = 'active', confirmed_at = now(), confirmed_by = auth.uid()
  where id = p_enrollment;
  perform public.notify(v_e.profile_id, 'course', 'Tečaj je odklenjen: ' || left(v_c.title, 80),
    'Organizator je potrdil plačilo. Lekcije so na voljo.', '/tecaji/' || v_c.slug);
end $$;

create function public.cancel_enrollment(p_enrollment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_e public.course_enrollments;
  v_c public.courses;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_e from public.course_enrollments where id = p_enrollment for update;
  select * into v_c from public.courses where id = v_e.course_id;
  if v_e.id is null or not public.is_space_role(v_c.space_id, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_e.status = 'cancelled' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.course_enrollments set status = 'cancelled', cancel_reason = left(btrim(p_reason), 300)
  where id = p_enrollment;
  perform public.notify(v_e.profile_id, 'course', 'Dostop do tečaja je preklican: ' || left(v_c.title, 80),
    left(btrim(p_reason), 300), '/tecaji/' || v_c.slug);
end $$;

create function public.set_lesson_done(p_lesson uuid, p_done boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_course uuid;
begin
  select course_id into v_course from public.course_lessons where id = p_lesson;
  if v_course is null or auth.uid() is null or not exists (
    select 1 from public.course_enrollments where course_id = v_course and profile_id = auth.uid() and status = 'active') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_done then
    insert into public.lesson_progress (profile_id, lesson_id) values (auth.uid(), p_lesson) on conflict do nothing;
  else
    delete from public.lesson_progress where profile_id = auth.uid() and lesson_id = p_lesson;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lessons (organizer): add at the end, move, remove
-- ---------------------------------------------------------------------------
create function public.add_lesson(p_course uuid, p_title text, p_youtube_id text, p_notes text, p_preview boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_space_role(public.course_space(p_course), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.course_lessons where course_id = p_course) >= 100 then
    raise exception 'too_many_lessons' using errcode = 'P0001';
  end if;
  insert into public.course_lessons (course_id, position, title, youtube_id, notes, is_preview)
  values (p_course, coalesce((select max(position) from public.course_lessons where course_id = p_course), 0) + 1,
    btrim(p_title), nullif(btrim(p_youtube_id), ''), nullif(btrim(p_notes), ''), coalesce(p_preview, false))
  returning id into v_id;
  return v_id;
end $$;

create function public.move_lesson(p_lesson uuid, p_up boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_l public.course_lessons;
  v_other public.course_lessons;
begin
  select * into v_l from public.course_lessons where id = p_lesson;
  if v_l.id is null or not public.is_space_role(public.course_space(v_l.course_id), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_up then
    select * into v_other from public.course_lessons where course_id = v_l.course_id and position < v_l.position
      order by position desc limit 1;
  else
    select * into v_other from public.course_lessons where course_id = v_l.course_id and position > v_l.position
      order by position asc limit 1;
  end if;
  if v_other.id is null then
    return;
  end if;
  update public.course_lessons set position = v_other.position where id = v_l.id;
  update public.course_lessons set position = v_l.position where id = v_other.id;
end $$;

create function public.remove_lesson(p_lesson uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_l public.course_lessons;
begin
  select * into v_l from public.course_lessons where id = p_lesson;
  if v_l.id is null or not public.is_space_role(public.course_space(v_l.course_id), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select status from public.courses where id = v_l.course_id) = 'published'
     and not exists (select 1 from public.course_lessons where course_id = v_l.course_id and id <> p_lesson
                     and youtube_id is not null) then
    raise exception 'course_needs_lessons' using errcode = 'P0001';
  end if;
  delete from public.course_lessons where id = p_lesson;
end $$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.courses enable row level security;
create policy courses_select on public.courses for select
  using (status = 'published' or public.is_space_role(space_id, 'staff') or public.is_platform_staff());
create policy courses_insert on public.courses for insert
  with check (public.is_space_role(space_id, 'admin') and created_by = auth.uid());
create policy courses_update on public.courses for update
  using (public.is_space_role(space_id, 'admin')) with check (public.is_space_role(space_id, 'admin'));

alter table public.course_lessons enable row level security;
create policy course_lessons_select on public.course_lessons for select
  using (public.has_course_access(course_id)
         or (is_preview and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')));
create policy course_lessons_update on public.course_lessons for update
  using (public.is_space_role(public.course_space(course_id), 'admin'))
  with check (public.is_space_role(public.course_space(course_id), 'admin'));

alter table public.course_enrollments enable row level security;
create policy course_enrollments_select on public.course_enrollments for select
  using (profile_id = auth.uid() or public.is_space_role(public.course_space(course_id), 'staff'));

alter table public.lesson_progress enable row level security;
create policy lesson_progress_select on public.lesson_progress for select
  using (profile_id = auth.uid() or exists (
    select 1 from public.course_lessons l where l.id = lesson_id
      and public.is_space_role(public.course_space(l.course_id), 'staff')));

revoke all on public.courses, public.course_lessons, public.course_enrollments, public.lesson_progress
  from anon, authenticated;
grant select (id, space_id, slug, title, summary, description, interest_id, cover, price_cents, status, published_at,
  created_at) on public.courses to anon;
grant select on public.courses to authenticated;
grant insert (space_id, slug, title, summary, description, interest_id, cover, price_cents, payment_instructions,
  payment_link, status, created_by) on public.courses to authenticated;
grant update (title, summary, description, interest_id, cover, price_cents, payment_instructions, payment_link, status)
  on public.courses to authenticated;
grant select on public.course_lessons to anon, authenticated;
grant update (title, youtube_id, notes, is_preview) on public.course_lessons to authenticated;
grant select on public.course_enrollments, public.lesson_progress to authenticated;
grant all on public.courses, public.course_lessons, public.course_enrollments, public.lesson_progress to service_role;

revoke execute on function
  public.course_space(uuid), public.has_course_access(uuid), public.guard_course(), public.course_outline(uuid),
  public.enroll_course(uuid), public.withdraw_enrollment(uuid), public.confirm_enrollment(uuid),
  public.cancel_enrollment(uuid, text), public.set_lesson_done(uuid, boolean),
  public.add_lesson(uuid, text, text, text, boolean), public.move_lesson(uuid, boolean), public.remove_lesson(uuid)
from public, anon, authenticated;
grant execute on function public.course_outline(uuid), public.has_course_access(uuid), public.course_space(uuid)
  to anon, authenticated;
grant execute on function
  public.enroll_course(uuid), public.withdraw_enrollment(uuid), public.confirm_enrollment(uuid),
  public.cancel_enrollment(uuid, text), public.set_lesson_done(uuid, boolean),
  public.add_lesson(uuid, text, text, text, boolean), public.move_lesson(uuid, boolean), public.remove_lesson(uuid)
to authenticated;
grant execute on all functions in schema public to service_role;

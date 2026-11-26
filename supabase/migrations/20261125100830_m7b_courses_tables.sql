-- M7b part 1: recorded courses — tables. Additive only; no row deletes.
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
  removed_at timestamptz,
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
  done boolean not null default true,
  completed_at timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow', 'idea_activity',
  'session_changed', 'waitlist_spot', 'reminder', 'community', 'pass', 'course'));

-- Deny everything until part 2 adds policies and grants.
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
revoke all on public.courses, public.course_lessons, public.course_enrollments, public.lesson_progress
  from anon, authenticated;

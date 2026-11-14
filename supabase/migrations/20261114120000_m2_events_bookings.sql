-- M2: events, occurrences, free bookings, saved events, in-app notifications.
-- Same rules as M1: RLS on every table, explicit grants, sensitive writes via SECURITY DEFINER RPCs.
-- Paid tickets / manual payments are intentionally NOT in this migration (founder decision #10).

create type public.event_schedule as enum ('one_off', 'multi_session', 'recurring');
create type public.booking_scope as enum ('series', 'occurrence');
create type public.event_visibility as enum ('public', 'unlisted');
create type public.registration_mode as enum ('native', 'external');
create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.occurrence_status as enum ('scheduled', 'cancelled');
create type public.booking_status as enum ('confirmed', 'cancelled_by_user', 'cancelled_by_organizer');
create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict');

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$'),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  summary text check (char_length(summary) <= 200),
  description text check (char_length(description) <= 5000),
  interest_id smallint references public.interests (id),
  schedule public.event_schedule not null default 'one_off',
  booking_scope public.booking_scope not null default 'occurrence',
  is_online boolean not null default false,
  visibility public.event_visibility not null default 'public',
  registration_mode public.registration_mode not null default 'native',
  external_url text check (external_url is null or external_url ~ '^https://'),
  city text check (char_length(city) <= 80),
  address text check (char_length(address) <= 200),
  online_url text check (online_url is null or online_url ~ '^https://'),
  capacity int check (capacity is null or capacity between 1 and 10000),
  max_per_booking smallint not null default 4 check (max_per_booking between 1 and 10),
  materials text check (char_length(materials) <= 1000),
  cancellation_policy public.cancellation_policy not null default 'flexible',
  cover text not null default 'coral' check (cover in ('coral', 'sun', 'sage', 'lilac', 'sky', 'clay')),
  status public.event_status not null default 'draft',
  cancel_reason text check (char_length(cancel_reason) <= 500),
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_needs_url check (registration_mode <> 'external' or external_url is not null),
  constraint series_scope check ((schedule = 'multi_session') = (booking_scope = 'series'))
);
create index events_space_idx on public.events (space_id);
create index events_status_idx on public.events (status, visibility);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.occurrence_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index event_occurrences_event_idx on public.event_occurrences (event_id, starts_at);
create index event_occurrences_starts_idx on public.event_occurrences (starts_at);

-- ---------------------------------------------------------------------------
-- Bookings (free in M2). occurrence_id NULL = whole series (multi-session).
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  occurrence_id uuid references public.event_occurrences (id) on delete cascade,
  booker_id uuid not null references public.profiles (id) on delete cascade,
  quantity smallint not null default 1 check (quantity between 1 and 10),
  note text check (char_length(note) <= 300),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index bookings_one_active_idx on public.bookings
  (booker_id, event_id, coalesce(occurrence_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'confirmed';
create index bookings_event_idx on public.bookings (event_id, occurrence_id) where status = 'confirmed';
create index bookings_booker_idx on public.bookings (booker_id);

create table public.saved_events (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, event_id)
);

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking')),
  title text not null check (char_length(title) <= 120),
  body text check (char_length(body) <= 1000),
  link text check (link is null or link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.event_space(p_event uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select space_id from public.events where id = p_event;
$$;

-- Seats taken for an occurrence (occurrence bookings) or for the whole event (series bookings).
create function public.seats_taken(p_event uuid, p_occurrence uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantity), 0)::int from public.bookings
  where event_id = p_event and status = 'confirmed'
    and (occurrence_id is not distinct from p_occurrence);
$$;

create function public.notify(p_recipient uuid, p_kind text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (recipient_id, kind, title, body, link)
  values (p_recipient, p_kind, p_title, p_body, p_link);
$$;

-- Organizers may see the profiles of people booked on their events.
create or replace function public.can_view_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    p_profile = auth.uid()
    or public.is_platform_staff()
    or exists (
      select 1 from public.profiles p
      where p.id = p_profile and p.status = 'active'
        and (p.visibility = 'public' or (p.visibility = 'members' and auth.uid() is not null))
    )
    or exists (
      select 1 from public.space_members target
      where target.profile_id = p_profile and target.status <> 'removed'
        and public.is_space_role(target.space_id, 'admin')
    )
    or exists (
      select 1 from public.bookings b join public.events e on e.id = b.event_id
      where b.booker_id = p_profile and public.is_space_role(e.space_id, 'staff')
    );
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.book_event(p_event uuid, p_occurrence uuid, p_quantity int, p_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_occ public.event_occurrences;
  v_taken int;
  v_id uuid;
  v_when text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Lock the event row: serialises concurrent bookings so capacity can never be exceeded.
  select * into v_event from public.events where id = p_event for update;
  if v_event.id is null or v_event.status <> 'published' then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;
  if v_event.registration_mode <> 'native' then
    raise exception 'external_registration' using errcode = 'P0001';
  end if;
  if p_quantity < 1 or p_quantity > v_event.max_per_booking then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;

  if v_event.booking_scope = 'series' then
    if p_occurrence is not null then
      raise exception 'series_booking' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.event_occurrences where event_id = p_event and status = 'scheduled' and starts_at > now()) then
      raise exception 'event_not_bookable' using errcode = 'P0001';
    end if;
    select min(starts_at)::text into v_when from public.event_occurrences where event_id = p_event;
  else
    select * into v_occ from public.event_occurrences where id = p_occurrence and event_id = p_event;
    if v_occ.id is null or v_occ.status <> 'scheduled' or v_occ.starts_at <= now() then
      raise exception 'event_not_bookable' using errcode = 'P0001';
    end if;
  end if;

  if v_event.capacity is not null then
    v_taken := public.seats_taken(p_event, p_occurrence);
    if v_taken + p_quantity > v_event.capacity then
      raise exception 'sold_out' using errcode = 'P0001';
    end if;
  end if;

  insert into public.bookings (event_id, occurrence_id, booker_id, quantity, note)
  values (p_event, p_occurrence, auth.uid(), p_quantity, nullif(btrim(p_note), ''))
  returning id into v_id;

  perform public.notify(auth.uid(), 'booking_confirmed', 'Prijava potrjena',
    v_event.title || ' · ' || p_quantity || case when p_quantity = 1 then ' oseba' when p_quantity = 2 then ' osebi' when p_quantity in (3, 4) then ' osebe' else ' oseb' end,
    '/dogodki/' || v_event.slug);
  return v_id;
exception
  when unique_violation then
    raise exception 'already_booked' using errcode = 'P0001';
end $$;

create function public.cancel_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set status = 'cancelled_by_user', cancelled_at = now()
    where id = p_booking and booker_id = auth.uid() and status = 'confirmed';
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
end $$;

create function public.publish_event(p_event uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_space_role(public.event_space(p_event), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.event_occurrences where event_id = p_event) then
    raise exception 'needs_occurrence' using errcode = 'P0001';
  end if;
  update public.events set status = 'published', published_at = coalesce(published_at, now())
    where id = p_event and status = 'draft';
  if not found then
    raise exception 'not_draft' using errcode = 'P0001';
  end if;
end $$;

-- Cancel the whole event: all active bookings are cancelled and every booker is notified.
create function public.cancel_event(p_event uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  r record;
begin
  if not public.is_space_role(public.event_space(p_event), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.events set status = 'cancelled', cancel_reason = btrim(p_reason)
    where id = p_event and status <> 'cancelled' returning * into v_event;
  if v_event.id is null then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;
  for r in
    update public.bookings set status = 'cancelled_by_organizer', cancelled_at = now()
      where event_id = p_event and status = 'confirmed' returning booker_id
  loop
    perform public.notify(r.booker_id, 'event_cancelled', 'Dogodek je odpovedan',
      v_event.title || ': ' || btrim(p_reason), '/dogodki/' || v_event.slug);
  end loop;
end $$;

-- Message every confirmed attendee (in-app notification).
create function public.notify_attendees(p_event uuid, p_message text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_count int := 0;
  r record;
begin
  if not public.is_space_role(public.event_space(p_event), 'staff') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 3 and 1000 then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;
  select * into v_event from public.events where id = p_event;
  for r in select distinct booker_id from public.bookings where event_id = p_event and status = 'confirmed'
  loop
    perform public.notify(r.booker_id, 'announcement', 'Obvestilo: ' || left(v_event.title, 100), btrim(p_message), '/dogodki/' || v_event.slug);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- The online link is shown only to confirmed attendees and the organizing team.
create function public.event_online_url(p_event uuid) returns text
language sql stable security definer set search_path = '' as $$
  select e.online_url from public.events e
  where e.id = p_event and (
    public.is_space_role(e.space_id, 'staff')
    or exists (select 1 from public.bookings b where b.event_id = e.id and b.booker_id = auth.uid() and b.status = 'confirmed')
  );
$$;

create function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where recipient_id = auth.uid() and read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.bookings enable row level security;
alter table public.saved_events enable row level security;
alter table public.notifications enable row level security;

create policy events_select on public.events for select
  using (status in ('published', 'cancelled') or public.is_space_role(space_id, 'staff') or public.is_platform_staff());
create policy events_insert on public.events for insert
  with check (public.is_space_role(space_id, 'admin') and created_by = auth.uid() and status = 'draft');
create policy events_update on public.events for update
  using (public.is_space_role(space_id, 'admin'))
  with check (public.is_space_role(space_id, 'admin'));
create policy events_delete_draft on public.events for delete
  using (public.is_space_role(space_id, 'admin') and status = 'draft');

create policy occurrences_select on public.event_occurrences for select
  using (exists (select 1 from public.events e where e.id = event_id
    and (e.status in ('published', 'cancelled') or public.is_space_role(e.space_id, 'staff') or public.is_platform_staff())));
create policy occurrences_write on public.event_occurrences for all
  using (public.is_space_role(public.event_space(event_id), 'admin'))
  with check (public.is_space_role(public.event_space(event_id), 'admin'));

create policy bookings_select on public.bookings for select
  using (booker_id = auth.uid() or public.is_space_role(public.event_space(event_id), 'staff') or public.is_platform_staff());

create policy saved_select on public.saved_events for select using (profile_id = auth.uid());
create policy saved_insert on public.saved_events for insert with check (profile_id = auth.uid() and public.is_active_user());
create policy saved_delete on public.saved_events for delete using (profile_id = auth.uid());

create policy notifications_select on public.notifications for select using (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.events, public.event_occurrences, public.bookings, public.saved_events, public.notifications
  from anon, authenticated;

-- Guests get the public preview only (no address, online link, description or materials).
grant select (id, space_id, slug, title, summary, interest_id, schedule, booking_scope, is_online, visibility,
  registration_mode, external_url, city, capacity, max_per_booking, cancellation_policy, cover, status,
  cancel_reason, is_demo, published_at, created_at) on public.events to anon;
grant select (id, space_id, created_by, slug, title, summary, description, interest_id, schedule, booking_scope,
  is_online, visibility, registration_mode, external_url, city, address, capacity, max_per_booking, materials,
  cancellation_policy, cover, status, cancel_reason, is_demo, published_at, created_at, updated_at)
  on public.events to authenticated;
grant insert (space_id, created_by, slug, title, summary, description, interest_id, schedule, booking_scope,
  is_online, visibility, registration_mode, external_url, city, address, online_url, capacity, max_per_booking,
  materials, cancellation_policy, cover) on public.events to authenticated;
grant update (title, summary, description, interest_id, is_online, visibility, external_url, city, address,
  online_url, capacity, max_per_booking, materials, cancellation_policy, cover) on public.events to authenticated;
grant delete on public.events to authenticated;

grant select on public.event_occurrences to anon, authenticated;
grant insert (event_id, starts_at, ends_at), update (starts_at, ends_at, status), delete
  on public.event_occurrences to authenticated;
grant select on public.bookings to authenticated;
grant select, insert, delete on public.saved_events to authenticated;
grant select on public.notifications to authenticated;

-- New functions are executable by PUBLIC by default (and by API roles via platform default privileges): reset first.
revoke execute on function
  public.event_space(uuid), public.seats_taken(uuid, uuid), public.notify(uuid, text, text, text, text),
  public.book_event(uuid, uuid, int, text), public.cancel_booking(uuid), public.publish_event(uuid),
  public.cancel_event(uuid, text), public.notify_attendees(uuid, text), public.event_online_url(uuid),
  public.mark_notifications_read()
from public, anon, authenticated;

grant execute on function public.event_space(uuid), public.seats_taken(uuid, uuid) to anon, authenticated;
grant execute on function
  public.book_event(uuid, uuid, int, text),
  public.cancel_booking(uuid),
  public.publish_event(uuid),
  public.cancel_event(uuid, text),
  public.notify_attendees(uuid, text),
  public.event_online_url(uuid),
  public.mark_notifications_read()
to authenticated;
-- notify() stays internal (no grant).

grant all on public.events, public.event_occurrences, public.bookings, public.saved_events, public.notifications to service_role;
grant execute on all functions in schema public to service_role;

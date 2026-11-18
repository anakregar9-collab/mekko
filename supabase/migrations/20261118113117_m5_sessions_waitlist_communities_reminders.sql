-- M5 bundle (founder 2026-11-18: "naredi vse in potem objavi"):
--  A. Reschedule / cancel / add sessions — bookings stay valid, people are notified and may cancel.
--  B. Waitlist when a session (or series) is full — waiting people are notified when seats free up.
--  C. Communities: join a space (open / approval), members-only events, members-only announcements.
--  D. Reminders the day before a booked session (in-app, pg_cron).
-- Additive only (no DROP).

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow', 'idea_activity',
  'session_changed', 'waitlist_spot', 'reminder', 'community'));

-- ===========================================================================
-- A. Sessions
-- ===========================================================================
-- Everyone booked on a session: its own bookings plus whole-series bookings of the event.
create function public.session_bookers(p_occ uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct b.booker_id from public.bookings b
  join public.event_occurrences o on o.id = p_occ
  where b.event_id = o.event_id and b.status = 'confirmed'
    and (b.occurrence_id = p_occ or b.occurrence_id is null);
$$;

create function public.reschedule_occurrence(p_occ uuid, p_starts timestamptz, p_ends timestamptz) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_occ public.event_occurrences;
  v_event public.events;
  v_n int := 0;
  r uuid;
  v_when text;
begin
  select * into v_occ from public.event_occurrences where id = p_occ for update;
  if v_occ.id is null or not public.is_space_role(public.event_space(v_occ.event_id), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_occ.status <> 'scheduled' or v_occ.starts_at <= now() then
    raise exception 'session_not_editable' using errcode = 'P0001';
  end if;
  if p_ends <= p_starts or p_starts <= now() then
    raise exception 'invalid_session_time' using errcode = 'P0001';
  end if;
  update public.event_occurrences set starts_at = p_starts, ends_at = p_ends where id = p_occ;
  select * into v_event from public.events where id = v_occ.event_id;
  if v_event.status = 'published' then
    v_when := to_char(p_starts at time zone 'Europe/Ljubljana', 'DD. MM. YYYY "ob" HH24:MI');
    for r in select * from public.session_bookers(p_occ) loop
      perform public.notify(r, 'session_changed', 'Termin je spremenjen: ' || left(v_event.title, 80),
        'Nov termin: ' || v_when || '. Tvoja prijava ostaja. Če ti ne ustreza, se lahko odjaviš na strani dogodka.',
        '/dogodki/' || v_event.slug);
      v_n := v_n + 1;
    end loop;
  end if;
  return v_n;
end $$;

-- Cancel one session. Bookings for that session are cancelled; whole-series bookers are told.
create function public.cancel_occurrence(p_occ uuid, p_reason text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_occ public.event_occurrences;
  v_event public.events;
  v_n int := 0;
  r uuid;
  v_when text;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_occ from public.event_occurrences where id = p_occ for update;
  if v_occ.id is null or not public.is_space_role(public.event_space(v_occ.event_id), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_occ.status <> 'scheduled' then
    raise exception 'session_not_editable' using errcode = 'P0001';
  end if;
  select * into v_event from public.events where id = v_occ.event_id;
  v_when := to_char(v_occ.starts_at at time zone 'Europe/Ljubljana', 'DD. MM. YYYY "ob" HH24:MI');
  for r in select * from public.session_bookers(p_occ) loop
    perform public.notify(r, 'session_changed', 'Termin je odpovedan: ' || left(v_event.title, 80),
      v_when || ' – ' || left(btrim(p_reason), 400), '/dogodki/' || v_event.slug);
    v_n := v_n + 1;
  end loop;
  update public.bookings set status = 'cancelled_by_organizer', cancelled_at = now()
    where occurrence_id = p_occ and status = 'confirmed';
  update public.event_occurrences set status = 'cancelled' where id = p_occ;
  return v_n;
end $$;

-- ===========================================================================
-- B. Waitlist
-- ===========================================================================
create table public.event_waitlist (
  event_id uuid not null references public.events (id) on delete cascade,
  occurrence_id uuid references public.event_occurrences (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quantity smallint not null default 1 check (quantity between 1 and 10),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index event_waitlist_one_idx on public.event_waitlist
  (profile_id, event_id, coalesce(occurrence_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index event_waitlist_queue_idx on public.event_waitlist (event_id, occurrence_id, created_at);

create function public.join_waitlist(p_event uuid, p_occurrence uuid, p_quantity int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_event from public.events where id = p_event;
  if v_event.id is null or v_event.status <> 'published' or v_event.registration_mode <> 'native'
     or v_event.capacity is null then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;
  if v_event.visibility::text = 'members' and not public.is_space_role(v_event.space_id, 'member') then
    raise exception 'members_only' using errcode = 'P0001';
  end if;
  if p_quantity < 1 or p_quantity > v_event.max_per_booking then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;
  if (v_event.booking_scope = 'series') <> (p_occurrence is null) then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;
  if public.seats_taken(p_event, p_occurrence) + p_quantity <= v_event.capacity then
    raise exception 'seats_available' using errcode = 'P0001';
  end if;
  insert into public.event_waitlist (event_id, occurrence_id, profile_id, quantity)
  values (p_event, p_occurrence, auth.uid(), p_quantity)
  on conflict do nothing;
end $$;

create function public.leave_waitlist(p_event uuid, p_occurrence uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.event_waitlist
  where profile_id = auth.uid() and event_id = p_event and occurrence_id is not distinct from p_occurrence;
$$;

-- Tell waiting people (oldest first) that seats are free; each person is told once per freed batch.
create function public.notify_waitlist(p_event uuid, p_occurrence uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_free int;
  r record;
begin
  select * into v_event from public.events where id = p_event;
  if v_event.id is null or v_event.status <> 'published' or v_event.capacity is null then
    return;
  end if;
  v_free := v_event.capacity - public.seats_taken(p_event, p_occurrence);
  if v_free <= 0 then
    return;
  end if;
  for r in
    select w.profile_id, w.quantity from public.event_waitlist w
    where w.event_id = p_event and w.occurrence_id is not distinct from p_occurrence
      and (w.notified_at is null or w.notified_at < now() - interval '12 hours')
    order by w.created_at
    limit 5
  loop
    perform public.notify(r.profile_id, 'waitlist_spot', 'Sprostilo se je mesto: ' || left(v_event.title, 80),
      'Prijavi se čim prej – mesto dobi tisti, ki se prvi prijavi.', '/dogodki/' || v_event.slug);
    update public.event_waitlist set notified_at = now()
      where profile_id = r.profile_id and event_id = p_event and occurrence_id is not distinct from p_occurrence;
  end loop;
end $$;

create function public.bookings_after_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- Booked: leave the waitlist for this session.
    delete from public.event_waitlist
    where profile_id = new.booker_id and event_id = new.event_id
      and occurrence_id is not distinct from new.occurrence_id;
  elsif old.status = 'confirmed' and new.status <> 'confirmed' then
    perform public.notify_waitlist(new.event_id, new.occurrence_id);
  end if;
  return new;
end $$;
create trigger bookings_after_change after insert or update of status on public.bookings
  for each row execute function public.bookings_after_change();

create function public.events_capacity_raised() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o record;
begin
  if new.capacity is not null and (old.capacity is null or new.capacity > old.capacity) then
    if new.booking_scope = 'series' then
      perform public.notify_waitlist(new.id, null);
    else
      for o in select id from public.event_occurrences where event_id = new.id and status = 'scheduled' and starts_at > now() loop
        perform public.notify_waitlist(new.id, o.id);
      end loop;
    end if;
  end if;
  return new;
end $$;
create trigger events_capacity_raised after update of capacity on public.events
  for each row execute function public.events_capacity_raised();

-- ===========================================================================
-- C. Communities
-- ===========================================================================
alter type public.event_visibility add value if not exists 'members';

-- Join requests are role 'member' + status 'pending'; they are not team invites.
create or replace function public.respond_space_invite(p_space uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.space_members
    set status = case when p_accept then 'active'::public.membership_status else 'removed' end
    where space_id = p_space and profile_id = auth.uid() and status = 'pending'
      and role not in ('owner', 'member');
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
end $$;

create function public.join_space(p_space uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_space public.spaces;
  v_status public.membership_status;
  v_owner uuid;
  v_name text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_space from public.spaces where id = p_space and deleted_at is null;
  if v_space.id is null or v_space.membership_mode = 'none' then
    raise exception 'membership_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.space_members where space_id = p_space and profile_id = auth.uid() and status <> 'removed') then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  v_status := case when v_space.membership_mode = 'open' then 'active' else 'pending' end;
  insert into public.space_members (space_id, profile_id, role, status, invited_by)
  values (p_space, auth.uid(), 'member', v_status, null)
  on conflict (space_id, profile_id) do update set role = 'member', status = excluded.status, invited_by = null
    where public.space_members.status = 'removed';
  if v_status = 'pending' then
    select display_name into v_name from public.profiles where id = auth.uid();
    select profile_id into v_owner from public.space_members where space_id = p_space and role = 'owner' and status = 'active';
    if v_owner is not null then
      perform public.notify(v_owner, 'community', 'Prošnja za članstvo: ' || left(v_space.name, 80),
        v_name || ' se želi pridružiti.', '/organizator/' || v_space.slug || '/clani');
    end if;
  end if;
  return v_status::text;
end $$;

create function public.leave_space(p_space uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.space_members set status = 'removed'
  where space_id = p_space and profile_id = auth.uid() and role = 'member' and status <> 'removed';
  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
end $$;

create function public.respond_member_request(p_space uuid, p_profile uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_space public.spaces;
begin
  if not public.is_space_role(p_space, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.space_members set status = case when p_accept then 'active'::public.membership_status else 'removed' end
  where space_id = p_space and profile_id = p_profile and role = 'member' and status = 'pending';
  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if p_accept then
    select * into v_space from public.spaces where id = p_space;
    perform public.notify(p_profile, 'community', 'Dobrodošel/-a v ' || left(v_space.name, 80),
      'Tvoja prošnja za članstvo je sprejeta.', '/prostori/' || v_space.slug);
  end if;
end $$;

-- Members-only events: visible and bookable only for members (and the team / platform staff).
alter policy events_select on public.events
  using ((status in ('published', 'cancelled') and (visibility::text <> 'members' or public.is_space_role(space_id, 'member')))
    or public.is_space_role(space_id, 'staff') or public.is_platform_staff());
alter policy occurrences_select on public.event_occurrences
  using (exists (select 1 from public.events e where e.id = event_id
    and ((e.status in ('published', 'cancelled') and (e.visibility::text <> 'members' or public.is_space_role(e.space_id, 'member')))
      or public.is_space_role(e.space_id, 'staff') or public.is_platform_staff())));

create function public.guard_members_only_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = new.event_id;
  if v_event.visibility::text = 'members' and not exists (
    select 1 from public.space_members m where m.space_id = v_event.space_id and m.profile_id = new.booker_id
      and m.status = 'active') then
    raise exception 'members_only' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger bookings_members_only before insert on public.bookings
  for each row execute function public.guard_members_only_booking();

-- Announcements for members (written by the team).
create table public.space_posts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index space_posts_space_idx on public.space_posts (space_id, created_at desc);

create function public.create_space_post(p_space uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_space public.spaces;
  r uuid;
begin
  if not public.is_space_role(p_space, 'staff') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 3000 then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;
  if (select count(*) from public.space_posts where space_id = p_space and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.space_posts (space_id, author_id, body) values (p_space, auth.uid(), btrim(p_body)) returning id into v_id;
  select * into v_space from public.spaces where id = p_space;
  for r in select profile_id from public.space_members
           where space_id = p_space and role = 'member' and status = 'active' loop
    perform public.notify(r, 'community', 'Novo za člane: ' || left(v_space.name, 80), left(btrim(p_body), 200),
      '/prostori/' || v_space.slug);
  end loop;
  return v_id;
end $$;

create function public.remove_space_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.space_posts set removed_at = now()
  where id = p_post and removed_at is null and public.is_space_role(space_id, 'staff');
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end $$;

alter table public.space_posts enable row level security;
create policy space_posts_select on public.space_posts for select
  using (removed_at is null and public.is_space_role(space_id, 'member'));
alter table public.event_waitlist enable row level security;
create policy event_waitlist_select on public.event_waitlist for select
  using (profile_id = auth.uid() or public.is_space_role(public.event_space(event_id), 'staff'));

-- ===========================================================================
-- D. Reminders (day before)
-- ===========================================================================
create table public.booking_reminders (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  occurrence_id uuid not null references public.event_occurrences (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (booking_id, occurrence_id)
);
alter table public.booking_reminders enable row level security;

create function public.send_event_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select b.id as booking_id, b.booker_id, o.id as occ_id, o.starts_at, e.title, e.slug, e.is_online, e.city
    from public.event_occurrences o
      join public.events e on e.id = o.event_id
      join public.bookings b on b.event_id = e.id and b.status = 'confirmed'
        and (b.occurrence_id = o.id or b.occurrence_id is null)
    where o.status = 'scheduled' and e.status = 'published'
      and o.starts_at between now() + interval '20 hours' and now() + interval '26 hours'
      and not exists (select 1 from public.booking_reminders x where x.booking_id = b.id and x.occurrence_id = o.id)
  loop
    insert into public.booking_reminders (booking_id, occurrence_id) values (r.booking_id, r.occ_id) on conflict do nothing;
    perform public.notify(r.booker_id, 'reminder', 'Jutri: ' || left(r.title, 100),
      to_char(r.starts_at at time zone 'Europe/Ljubljana', '"ob" HH24:MI') ||
        case when r.is_online then ' · online' else coalesce(' · ' || r.city, '') end,
      '/dogodki/' || r.slug);
    n := n + 1;
  end loop;
  return n;
end $$;

select cron.schedule('mekko-event-reminders', '*/15 * * * *', $$select public.send_event_reminders()$$);

-- ===========================================================================
-- Grants
-- ===========================================================================
revoke all on public.event_waitlist, public.space_posts, public.booking_reminders from anon, authenticated;
grant select on public.event_waitlist, public.space_posts to authenticated;
grant all on public.event_waitlist, public.space_posts, public.booking_reminders to service_role;

revoke execute on function
  public.session_bookers(uuid), public.reschedule_occurrence(uuid, timestamptz, timestamptz),
  public.cancel_occurrence(uuid, text), public.join_waitlist(uuid, uuid, int), public.leave_waitlist(uuid, uuid),
  public.notify_waitlist(uuid, uuid), public.bookings_after_change(), public.events_capacity_raised(),
  public.join_space(uuid), public.leave_space(uuid), public.respond_member_request(uuid, uuid, boolean),
  public.guard_members_only_booking(), public.create_space_post(uuid, text), public.remove_space_post(uuid),
  public.send_event_reminders()
from public, anon, authenticated;
grant execute on function
  public.reschedule_occurrence(uuid, timestamptz, timestamptz), public.cancel_occurrence(uuid, text),
  public.join_waitlist(uuid, uuid, int), public.leave_waitlist(uuid, uuid),
  public.join_space(uuid), public.leave_space(uuid), public.respond_member_request(uuid, uuid, boolean),
  public.create_space_post(uuid, text), public.remove_space_post(uuid)
to authenticated;
grant execute on all functions in schema public to service_role;

-- Public member count for a space page (only a number, never who).
create function public.space_member_count(p_space uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.space_members
  where space_id = p_space and role = 'member' and status = 'active';
$$;
revoke execute on function public.space_member_count(uuid) from public;
grant execute on function public.space_member_count(uuid) to anon, authenticated;

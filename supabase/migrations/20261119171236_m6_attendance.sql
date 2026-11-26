-- Studio tools: attendance per booking and session (organizer bookkeeping, visible to the space team only).
-- Additive only.

create table public.attendance (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  occurrence_id uuid not null references public.event_occurrences (id) on delete cascade,
  present boolean not null,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (booking_id, occurrence_id)
);
create index attendance_occurrence_idx on public.attendance (occurrence_id);

alter table public.attendance enable row level security;
create policy attendance_select on public.attendance for select
  using (exists (select 1 from public.event_occurrences o
                 where o.id = occurrence_id and public.is_space_role(public.event_space(o.event_id), 'staff')));

-- Mark a person present/absent for one session; p_present null clears the mark.
-- Allowed for the space team from 12 hours before the session starts.
create function public.set_attendance(p_booking uuid, p_occurrence uuid, p_present boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
  v_o public.event_occurrences;
begin
  select * into v_o from public.event_occurrences where id = p_occurrence;
  if v_o.id is null or not public.is_space_role(public.event_space(v_o.event_id), 'staff') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_b from public.bookings where id = p_booking;
  if v_b.id is null or v_b.event_id <> v_o.event_id or v_b.status <> 'confirmed'
     or (v_b.occurrence_id is not null and v_b.occurrence_id <> p_occurrence) then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
  if v_o.status <> 'scheduled' or v_o.starts_at > now() + interval '12 hours' then
    raise exception 'attendance_not_open' using errcode = 'P0001';
  end if;
  if p_present is null then
    delete from public.attendance where booking_id = p_booking and occurrence_id = p_occurrence;
  else
    insert into public.attendance (booking_id, occurrence_id, present, marked_by)
    values (p_booking, p_occurrence, p_present, auth.uid())
    on conflict (booking_id, occurrence_id)
      do update set present = excluded.present, marked_by = excluded.marked_by, marked_at = now();
  end if;
end $$;

revoke all on public.attendance from anon, authenticated;
grant select on public.attendance to authenticated;
grant all on public.attendance to service_role;
revoke execute on function public.set_attendance(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated, service_role;

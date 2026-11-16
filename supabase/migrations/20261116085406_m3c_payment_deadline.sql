-- M3c: optional automatic release of unpaid manual-payment reservations (founder 2026-11-16:
-- "manual release for now, but give organizers the option to release automatically").
-- Default = no deadline (organizer releases manually). Organizer may pick 1, 2, 3 or 7 days.

alter table public.events
  add column payment_deadline_hours smallint
    check (payment_deadline_hours is null or payment_deadline_hours in (24, 48, 72, 168));
alter table public.events add constraint deadline_only_manual
  check (payment_deadline_hours is null or payment_mode = 'manual');

alter table public.bookings add column payment_due_at timestamptz;
create index bookings_due_idx on public.bookings (payment_due_at)
  where payment_state = 'awaiting' and status = 'confirmed';

-- Deadline is part of the locked payment terms.
create or replace function public.lock_payment_terms() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft' and (
    new.payment_mode is distinct from old.payment_mode
    or new.price_cents is distinct from old.price_cents
    or new.payment_instructions is distinct from old.payment_instructions
    or new.payment_deadline_hours is distinct from old.payment_deadline_hours) then
    raise exception 'payment_terms_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Snapshot also the due time: booking time + deadline, but never later than the start of the booked session
-- (for series bookings: the first upcoming session).
create or replace function public.bookings_payment_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_start timestamptz;
begin
  select * into v_event from public.events where id = new.event_id;
  new.payment_confirmed_at := null;
  new.payment_confirmed_by := null;
  new.payment_due_at := null;
  if v_event.payment_mode = 'manual' then
    new.payment_state := 'awaiting';
    new.amount_cents := v_event.price_cents * new.quantity;
    if v_event.payment_deadline_hours is not null then
      select min(starts_at) into v_start from public.event_occurrences
      where event_id = new.event_id and status = 'scheduled' and starts_at > now()
        and (new.occurrence_id is null or id = new.occurrence_id);
      new.payment_due_at := least(now() + make_interval(hours => v_event.payment_deadline_hours),
                                  coalesce(v_start, 'infinity'));
    end if;
  else
    new.payment_state := 'none';
    new.amount_cents := null;
  end if;
  return new;
end $$;

-- Release every overdue unpaid reservation (optionally only for one event). Internal: called by
-- book_event (so freed seats are available immediately) and by a pg_cron job every 10 minutes.
create function public.release_overdue_reservations(p_event uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    update public.bookings b set status = 'cancelled_by_organizer', cancelled_at = now()
    from public.events e
    where e.id = b.event_id and b.status = 'confirmed' and b.payment_state = 'awaiting'
      and b.payment_due_at is not null and b.payment_due_at <= now()
      and (p_event is null or b.event_id = p_event)
    returning b.booker_id, e.title, e.slug
  loop
    perform public.notify(r.booker_id, 'booking_released', 'Rezervacija je sproščena',
      r.title || ': rok za plačilo je potekel, zato je mesto spet prosto.', '/dogodki/' || r.slug);
    n := n + 1;
  end loop;
  return n;
end $$;

-- book_event: release overdue reservations for this event before checking capacity.
create or replace function public.book_event(p_event uuid, p_occurrence uuid, p_quantity int, p_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_occ public.event_occurrences;
  v_taken int;
  v_id uuid;
  v_people text;
  v_due timestamptz;
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
  else
    select * into v_occ from public.event_occurrences where id = p_occurrence and event_id = p_event;
    if v_occ.id is null or v_occ.status <> 'scheduled' or v_occ.starts_at <= now() then
      raise exception 'event_not_bookable' using errcode = 'P0001';
    end if;
  end if;

  if v_event.payment_deadline_hours is not null then
    perform public.release_overdue_reservations(p_event);
  end if;

  if v_event.capacity is not null then
    v_taken := public.seats_taken(p_event, p_occurrence);
    if v_taken + p_quantity > v_event.capacity then
      raise exception 'sold_out' using errcode = 'P0001';
    end if;
  end if;

  insert into public.bookings (event_id, occurrence_id, booker_id, quantity, note)
  values (p_event, p_occurrence, auth.uid(), p_quantity, nullif(btrim(p_note), ''))
  returning id, payment_due_at into v_id, v_due;

  v_people := p_quantity || case when p_quantity = 1 then ' oseba' when p_quantity = 2 then ' osebi'
    when p_quantity in (3, 4) then ' osebe' else ' oseb' end;
  if v_event.payment_mode = 'manual' then
    perform public.notify(auth.uid(), 'booking_confirmed', 'Mesto je rezervirano – čaka na plačilo',
      v_event.title || ' · ' || v_people || '. Plačilo poteka neposredno z organizatorjem; navodila so na strani dogodka.'
        || case when v_due is not null
             then ' Plačaj do ' || to_char(v_due at time zone 'Europe/Ljubljana', 'DD. MM. YYYY "ob" HH24:MI')
                  || ', sicer se mesto sprosti.'
             else '' end,
      '/dogodki/' || v_event.slug);
  else
    perform public.notify(auth.uid(), 'booking_confirmed', 'Prijava potrjena',
      v_event.title || ' · ' || v_people, '/dogodki/' || v_event.slug);
  end if;
  return v_id;
exception
  when unique_violation then
    raise exception 'already_booked' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------------
-- Grants + schedule
-- ---------------------------------------------------------------------------
grant select (payment_deadline_hours) on public.events to anon, authenticated;
grant insert (payment_deadline_hours), update (payment_deadline_hours) on public.events to authenticated;
revoke execute on function public.release_overdue_reservations(uuid) from public, anon, authenticated;
grant execute on function public.release_overdue_reservations(uuid) to service_role;

create extension if not exists pg_cron;
select cron.schedule('mekko-release-overdue-reservations', '*/10 * * * *',
  $$select public.release_overdue_reservations()$$);

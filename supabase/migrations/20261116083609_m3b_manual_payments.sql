-- M3b: events with manual / off-platform payment (DECISIONS #4, #10).
-- Mekko does NOT process money. A booking on a manual-payment event reserves the seat and waits until the
-- organizer confirms they received the payment. Mekko never states "plačano" on its own; no commission.

-- ---------------------------------------------------------------------------
-- Events: price + payment mode
-- ---------------------------------------------------------------------------
alter table public.events
  add column payment_mode text not null default 'free' check (payment_mode in ('free', 'manual')),
  add column price_cents int check (price_cents is null or price_cents between 50 and 100000),
  add column payment_instructions text check (char_length(payment_instructions) <= 1000);
alter table public.events add constraint manual_payment_fields check (
  (payment_mode = 'free' and price_cents is null and payment_instructions is null)
  or (payment_mode = 'manual' and price_cents is not null
      and coalesce(char_length(btrim(payment_instructions)), 0) >= 5 and registration_mode = 'native')
);

-- Payment terms are fixed once an event is published (no price changes under existing bookings).
create function public.lock_payment_terms() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft' and (
    new.payment_mode is distinct from old.payment_mode
    or new.price_cents is distinct from old.price_cents
    or new.payment_instructions is distinct from old.payment_instructions) then
    raise exception 'payment_terms_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger events_lock_payment_terms before update on public.events
  for each row execute function public.lock_payment_terms();

-- ---------------------------------------------------------------------------
-- Bookings: payment state snapshot
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column payment_state text not null default 'none' check (payment_state in ('none', 'awaiting', 'organizer_confirmed')),
  add column amount_cents int check (amount_cents is null or amount_cents >= 0),
  add column payment_confirmed_at timestamptz,
  add column payment_confirmed_by uuid references public.profiles (id);
create index bookings_awaiting_idx on public.bookings (event_id) where payment_state = 'awaiting' and status = 'confirmed';

-- Snapshot price × quantity at booking time; every new booking on a manual event starts as "awaiting".
create function public.bookings_payment_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_mode text;
  v_price int;
begin
  select payment_mode, price_cents into v_mode, v_price from public.events where id = new.event_id;
  if v_mode = 'manual' then
    new.payment_state := 'awaiting';
    new.amount_cents := v_price * new.quantity;
  else
    new.payment_state := 'none';
    new.amount_cents := null;
  end if;
  new.payment_confirmed_at := null;
  new.payment_confirmed_by := null;
  return new;
end $$;
create trigger bookings_payment_snapshot before insert on public.bookings
  for each row execute function public.bookings_payment_snapshot();

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released'));

-- ---------------------------------------------------------------------------
-- book_event: same rules as M2; the notification says when payment is still expected.
-- ---------------------------------------------------------------------------
create or replace function public.book_event(p_event uuid, p_occurrence uuid, p_quantity int, p_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_occ public.event_occurrences;
  v_taken int;
  v_id uuid;
  v_people text;
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

  if v_event.capacity is not null then
    v_taken := public.seats_taken(p_event, p_occurrence);
    if v_taken + p_quantity > v_event.capacity then
      raise exception 'sold_out' using errcode = 'P0001';
    end if;
  end if;

  insert into public.bookings (event_id, occurrence_id, booker_id, quantity, note)
  values (p_event, p_occurrence, auth.uid(), p_quantity, nullif(btrim(p_note), ''))
  returning id into v_id;

  v_people := p_quantity || case when p_quantity = 1 then ' oseba' when p_quantity = 2 then ' osebi'
    when p_quantity in (3, 4) then ' osebe' else ' oseb' end;
  if v_event.payment_mode = 'manual' then
    perform public.notify(auth.uid(), 'booking_confirmed', 'Mesto je rezervirano – čaka na plačilo',
      v_event.title || ' · ' || v_people || '. Plačilo poteka neposredno z organizatorjem; navodila so na strani dogodka.',
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
-- Organizer RPCs
-- ---------------------------------------------------------------------------
-- The organizer states they received the payment. Recorded with who and when.
create function public.confirm_booking_payment(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
  v_event public.events;
begin
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null or not public.is_space_role(public.event_space(v_b.event_id), 'staff') then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
  if v_b.status <> 'confirmed' or v_b.payment_state <> 'awaiting' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.bookings set payment_state = 'organizer_confirmed', payment_confirmed_at = now(),
    payment_confirmed_by = auth.uid()
  where id = p_booking;
  select * into v_event from public.events where id = v_b.event_id;
  perform public.notify(v_b.booker_id, 'payment_confirmed', 'Organizator je potrdil prejem plačila',
    v_event.title, '/dogodki/' || v_event.slug);
end $$;

-- Release an unpaid reservation (seat goes back on sale). Reason is shown to the booker.
create function public.release_unpaid_booking(p_booking uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_b public.bookings;
  v_event public.events;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null or not public.is_space_role(public.event_space(v_b.event_id), 'staff') then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
  if v_b.status <> 'confirmed' or v_b.payment_state <> 'awaiting' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.bookings set status = 'cancelled_by_organizer', cancelled_at = now() where id = p_booking;
  select * into v_event from public.events where id = v_b.event_id;
  perform public.notify(v_b.booker_id, 'booking_released', 'Rezervacija je sproščena',
    v_event.title || ': ' || left(btrim(p_reason), 500), '/dogodki/' || v_event.slug);
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Guests see price + mode (preview); signed-in users also see the payment instructions.
grant select (payment_mode, price_cents) on public.events to anon;
grant select (payment_mode, price_cents, payment_instructions) on public.events to authenticated;
grant insert (payment_mode, price_cents, payment_instructions) on public.events to authenticated;
grant update (payment_mode, price_cents, payment_instructions) on public.events to authenticated;

revoke execute on function
  public.lock_payment_terms(), public.bookings_payment_snapshot(),
  public.confirm_booking_payment(uuid), public.release_unpaid_booking(uuid, text)
from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(uuid), public.release_unpaid_booking(uuid, text) to authenticated;
grant execute on all functions in schema public to service_role;

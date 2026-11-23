-- M7a: passes ("karte", e.g. 10 visits) — founder decisions 2026-11-23:
--  * the organizer defines visits, price and validity; payment is manual (IBAN etc.) or the organizer's OWN Stripe
--    payment link — no money goes through Mekko, no Mekko commission;
--  * a cancelled session gives the visit back (visits are counted from confirmed bookings); refunds are the
--    organizer's business;
--  * unused visits expire at valid_until; the organizer may extend.
-- Also: optional payment link on paid events. Additive only.

-- ---------------------------------------------------------------------------
-- Payment links (organizer's own Stripe/other checkout page; Mekko only shows the link)
-- ---------------------------------------------------------------------------
alter table public.events add column payment_link text
  check (payment_link is null or (payment_link ~ '^https://[^\s]+$' and char_length(payment_link) <= 500));
alter table public.events add column accepts_passes boolean not null default false;
grant select (payment_link) on public.events to authenticated;
grant select (accepts_passes) on public.events to anon, authenticated;
grant insert (payment_link, accepts_passes), update (payment_link, accepts_passes) on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- Pass types (defined by the space) and passes (bought by people)
-- ---------------------------------------------------------------------------
create table public.pass_types (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  visits int not null check (visits between 1 and 100),
  price_cents int not null check (price_cents between 50 and 500000),
  validity_days int not null check (validity_days between 7 and 730),
  payment_instructions text not null check (char_length(btrim(payment_instructions)) between 5 and 1000),
  payment_link text check (payment_link is null or (payment_link ~ '^https://[^\s]+$' and char_length(payment_link) <= 500)),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index pass_types_space_idx on public.pass_types (space_id) where active;

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  pass_type_id uuid not null references public.pass_types (id) on delete restrict,
  space_id uuid not null references public.spaces (id) on delete cascade,
  holder_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  visits int not null,
  price_cents int not null,
  validity_days int not null,
  status text not null default 'awaiting' check (status in ('awaiting', 'active', 'cancelled')),
  valid_from timestamptz,
  valid_until timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now()
);
create index passes_holder_idx on public.passes (holder_id);
create index passes_space_idx on public.passes (space_id, status);
create unique index passes_one_request_idx on public.passes (holder_id, pass_type_id) where status = 'awaiting';

alter table public.bookings add column pass_id uuid references public.passes (id) on delete set null;
create index bookings_pass_idx on public.bookings (pass_id) where pass_id is not null;

-- Paid pass types need the organizer's legal status, like paid events.
create function public.guard_pass_type() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.active and (select legal_form from public.spaces where id = new.space_id) is null then
    raise exception 'legal_info_required' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.space_id <> old.space_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger pass_types_guard before insert or update on public.pass_types
  for each row execute function public.guard_pass_type();

-- Visits used = persons on confirmed bookings made with the pass (cancellations give visits back).
-- Only the holder and the space team may read it.
create function public.pass_visits_used(p_pass uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(b.quantity), 0)::int from public.bookings b
  where b.pass_id = p_pass and b.status = 'confirmed'
    and exists (select 1 from public.passes p where p.id = p_pass
                and (p.holder_id = auth.uid() or public.is_space_role(p.space_id, 'staff')));
$$;

-- Bookings made with a pass are already paid (otherwise identical to the M3c version: deadline snapshot).
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
  if v_event.payment_mode = 'manual' and new.pass_id is null then
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

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow', 'idea_activity',
  'session_changed', 'waitlist_spot', 'reminder', 'community', 'pass'));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.request_pass(p_type uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_t public.pass_types;
  v_space public.spaces;
  v_id uuid;
  v_owner uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_t from public.pass_types where id = p_type and active;
  select * into v_space from public.spaces where id = v_t.space_id and deleted_at is null;
  if v_t.id is null or v_space.id is null then
    raise exception 'pass_not_available' using errcode = 'P0001';
  end if;
  if (select count(*) from public.passes where holder_id = auth.uid() and status = 'awaiting') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.passes (pass_type_id, space_id, holder_id, name, visits, price_cents, validity_days)
  values (v_t.id, v_t.space_id, auth.uid(), v_t.name, v_t.visits, v_t.price_cents, v_t.validity_days)
  returning id into v_id;
  select profile_id into v_owner from public.space_members where space_id = v_t.space_id and role = 'owner' and status = 'active';
  if v_owner is not null then
    perform public.notify(v_owner, 'pass', 'Nov nakup karte: ' || left(v_t.name, 80),
      (select display_name from public.profiles where id = auth.uid()) || ' čaka na potrditev plačila.',
      '/organizator/' || v_space.slug || '/karte');
  end if;
  return v_id;
exception
  when unique_violation then
    raise exception 'pass_already_requested' using errcode = 'P0001';
end $$;

-- Holder withdraws an unpaid request.
create function public.withdraw_pass(p_pass uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.passes set status = 'cancelled', cancel_reason = 'Preklical/-a kupec.'
  where id = p_pass and holder_id = auth.uid() and status = 'awaiting';
  if not found then
    raise exception 'pass_not_found' using errcode = 'P0002';
  end if;
end $$;

-- Organizer confirms payment: the pass becomes active for validity_days from now.
create function public.confirm_pass(p_pass uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.passes;
  v_slug text;
begin
  select * into v_p from public.passes where id = p_pass for update;
  if v_p.id is null or not public.is_space_role(v_p.space_id, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_p.status <> 'awaiting' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.passes set status = 'active', valid_from = now(),
    valid_until = now() + make_interval(days => v_p.validity_days), confirmed_at = now(), confirmed_by = auth.uid()
  where id = p_pass;
  select slug into v_slug from public.spaces where id = v_p.space_id;
  perform public.notify(v_p.holder_id, 'pass', 'Karta je aktivna: ' || left(v_p.name, 80),
    v_p.visits || ' obiskov, velja do ' ||
      to_char((now() + make_interval(days => v_p.validity_days)) at time zone 'Europe/Ljubljana', 'DD. MM. YYYY') || '.',
    '/moj-mekko/karte');
end $$;

-- Organizer rejects an unpaid request or cancels an active pass (future bookings with it are cancelled).
create function public.cancel_pass(p_pass uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.passes;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_p from public.passes where id = p_pass for update;
  if v_p.id is null or not public.is_space_role(v_p.space_id, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_p.status = 'cancelled' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.passes set status = 'cancelled', cancel_reason = left(btrim(p_reason), 300) where id = p_pass;
  update public.bookings b set status = 'cancelled_by_organizer', cancelled_at = now()
  from public.event_occurrences o
  where b.pass_id = p_pass and b.status = 'confirmed' and o.id = b.occurrence_id and o.starts_at > now();
  perform public.notify(v_p.holder_id, 'pass', 'Karta je preklicana: ' || left(v_p.name, 80),
    left(btrim(p_reason), 300), '/moj-mekko/karte');
end $$;

-- Organizer extends validity (also revives an expired pass).
create function public.extend_pass(p_pass uuid, p_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.passes;
begin
  select * into v_p from public.passes where id = p_pass for update;
  if v_p.id is null or not public.is_space_role(v_p.space_id, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_p.status <> 'active' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_until <= greatest(now(), v_p.valid_until) or p_until > now() + interval '3 years' then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;
  update public.passes set valid_until = p_until where id = p_pass;
  perform public.notify(v_p.holder_id, 'pass', 'Karta je podaljšana: ' || left(v_p.name, 80),
    'Velja do ' || to_char(p_until at time zone 'Europe/Ljubljana', 'DD. MM. YYYY') || '.', '/moj-mekko/karte');
end $$;

-- Book one session with a pass (same capacity rules as book_event; no payment step).
create function public.book_with_pass(p_event uuid, p_occurrence uuid, p_quantity int, p_pass uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_occ public.event_occurrences;
  v_pass public.passes;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_event from public.events where id = p_event for update;
  if v_event.id is null or v_event.status <> 'published' or v_event.registration_mode <> 'native'
     or v_event.booking_scope <> 'occurrence' then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;
  if not v_event.accepts_passes then
    raise exception 'pass_not_accepted' using errcode = 'P0001';
  end if;
  if p_quantity < 1 or p_quantity > v_event.max_per_booking then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;
  select * into v_occ from public.event_occurrences where id = p_occurrence and event_id = p_event;
  if v_occ.id is null or v_occ.status <> 'scheduled' or v_occ.starts_at <= now() then
    raise exception 'event_not_bookable' using errcode = 'P0001';
  end if;
  -- Lock the pass so two bookings cannot spend the same visit.
  select * into v_pass from public.passes where id = p_pass for update;
  if v_pass.id is null or v_pass.holder_id <> auth.uid() or v_pass.space_id <> v_event.space_id
     or v_pass.status <> 'active' then
    raise exception 'pass_not_valid' using errcode = 'P0001';
  end if;
  if v_pass.valid_until < v_occ.starts_at then
    raise exception 'pass_expired' using errcode = 'P0001';
  end if;
  if public.pass_visits_used(p_pass) + p_quantity > v_pass.visits then
    raise exception 'pass_no_visits' using errcode = 'P0001';
  end if;
  if v_event.payment_deadline_hours is not null then
    perform public.release_overdue_reservations(p_event);
  end if;
  if v_event.capacity is not null and public.seats_taken(p_event, p_occurrence) + p_quantity > v_event.capacity then
    raise exception 'sold_out' using errcode = 'P0001';
  end if;
  insert into public.bookings (event_id, occurrence_id, booker_id, quantity, pass_id)
  values (p_event, p_occurrence, auth.uid(), p_quantity, p_pass)
  returning id into v_id;
  perform public.notify(auth.uid(), 'booking_confirmed', 'Prijava potrjena (s karto)',
    v_event.title || ' · ' || to_char(v_occ.starts_at at time zone 'Europe/Ljubljana', 'DD. MM. "ob" HH24:MI')
      || '. Ostane ' || (v_pass.visits - public.pass_visits_used(p_pass)) || ' obiskov.',
    '/dogodki/' || v_event.slug);
  return v_id;
exception
  when unique_violation then
    raise exception 'already_booked' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.pass_types enable row level security;
create policy pass_types_select on public.pass_types for select
  using (active or public.is_space_role(space_id, 'staff'));
create policy pass_types_insert on public.pass_types for insert
  with check (public.is_space_role(space_id, 'admin') and created_by = auth.uid());
create policy pass_types_update on public.pass_types for update
  using (public.is_space_role(space_id, 'admin')) with check (public.is_space_role(space_id, 'admin'));

alter table public.passes enable row level security;
create policy passes_select on public.passes for select
  using (holder_id = auth.uid() or public.is_space_role(space_id, 'staff'));

revoke all on public.pass_types, public.passes from anon, authenticated;
grant select (id, space_id, name, description, visits, price_cents, validity_days, active, created_at)
  on public.pass_types to anon;
grant select on public.pass_types to authenticated;
grant insert (space_id, name, description, visits, price_cents, validity_days, payment_instructions, payment_link,
  active, created_by) on public.pass_types to authenticated;
grant update (name, description, payment_instructions, payment_link, active) on public.pass_types to authenticated;
grant select on public.passes to authenticated;
grant all on public.pass_types, public.passes to service_role;

revoke execute on function
  public.guard_pass_type(), public.pass_visits_used(uuid), public.request_pass(uuid), public.withdraw_pass(uuid),
  public.confirm_pass(uuid), public.cancel_pass(uuid, text), public.extend_pass(uuid, timestamptz),
  public.book_with_pass(uuid, uuid, int, uuid)
from public, anon, authenticated;
grant execute on function
  public.pass_visits_used(uuid), public.request_pass(uuid), public.withdraw_pass(uuid), public.confirm_pass(uuid),
  public.cancel_pass(uuid, text), public.extend_pass(uuid, timestamptz), public.book_with_pass(uuid, uuid, int, uuid)
to authenticated;
grant execute on all functions in schema public to service_role;

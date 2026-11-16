-- M3d: organizer legal status + provider details (marketplace information duty, ZVPot-1 / Omnibus;
-- trader traceability, DSA). Wording of the consumer notice is pending legal review (DECISIONS 2026-11-16).
--   company      = podjetje (d.o.o., d.d., ...)
--   sole_trader  = samostojni podjetnik (s.p.)
--   association  = društvo, zavod, nevladna organizacija
--   odd          = osebno dopolnilno delo (registered with AJPES)
--   private      = zasebnik brez registrirane dejavnosti (not a trader)

alter table public.spaces add column legal_form text
  check (legal_form is null or legal_form in ('company', 'sole_trader', 'association', 'odd', 'private'));

-- Provider details are visible to signed-in users only (shown before booking, which requires sign-in).
create table public.space_legal_info (
  space_id uuid primary key references public.spaces (id) on delete cascade,
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 120),
  address text not null check (char_length(btrim(address)) between 5 and 200),
  registration_number text check (char_length(registration_number) <= 30),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 120),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.space_legal_info enable row level security;
create policy space_legal_info_select on public.space_legal_info for select
  using (auth.uid() is not null);
revoke all on public.space_legal_info from anon, authenticated;
grant select on public.space_legal_info to authenticated;
grant all on public.space_legal_info to service_role;

create function public.set_space_legal_info(
  p_space uuid, p_form text, p_name text default null, p_address text default null,
  p_registration text default null, p_email text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_space_role(p_space, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_form is null or p_form not in ('company', 'sole_trader', 'association', 'odd', 'private') then
    raise exception 'invalid_legal_form' using errcode = 'P0001';
  end if;
  if p_form = 'private' then
    delete from public.space_legal_info where space_id = p_space;
  else
    if p_form in ('company', 'sole_trader') and nullif(btrim(p_registration), '') is null then
      raise exception 'registration_required' using errcode = 'P0001';
    end if;
    insert into public.space_legal_info (space_id, legal_name, address, registration_number, contact_email, updated_by)
    values (p_space, btrim(p_name), btrim(p_address), nullif(btrim(p_registration), ''), lower(btrim(p_email)), auth.uid())
    on conflict (space_id) do update set
      legal_name = excluded.legal_name, address = excluded.address,
      registration_number = excluded.registration_number, contact_email = excluded.contact_email,
      updated_at = now(), updated_by = auth.uid();
  end if;
  update public.spaces set legal_form = p_form where id = p_space;
end $$;

-- Paid (manual-payment) events can only be published once the organizer stated their legal status.
create or replace function public.publish_event(p_event uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
begin
  if not public.is_space_role(public.event_space(p_event), 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.event_occurrences where event_id = p_event) then
    raise exception 'needs_occurrence' using errcode = 'P0001';
  end if;
  select * into v_event from public.events where id = p_event;
  if v_event.payment_mode = 'manual'
     and (select legal_form from public.spaces where id = v_event.space_id) is null then
    raise exception 'legal_info_required' using errcode = 'P0001';
  end if;
  update public.events set status = 'published', published_at = coalesce(published_at, now())
    where id = p_event and status = 'draft';
  if not found then
    raise exception 'not_draft' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function public.set_space_legal_info(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_space_legal_info(uuid, text, text, text, text, text) to authenticated;
grant execute on all functions in schema public to service_role;

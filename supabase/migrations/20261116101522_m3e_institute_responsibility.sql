-- M3e (founder 2026-11-16): "zavod" as its own legal form, and an organizer acknowledgement that registration,
-- invoicing, accepting cash, taxes and refunds are the organizer's responsibility, not Mekko's.
-- Written without DROP statements (the hosted migration tool asks for a confirmation the founder never receives):
--   * the old column is renamed to legal_form_v1 (obsolete, kept read-only) and a new legal_form column with the
--     wider check takes its place, so all code keeps using "legal_form";
--   * the old 6-argument set_space_legal_info is replaced by a stub that always refuses (it cannot skip the
--     acknowledgement); the new 7-argument version is the only working one.

alter table public.spaces rename column legal_form to legal_form_v1;
comment on column public.spaces.legal_form_v1 is 'OBSOLETE since M3e: replaced by legal_form. Remove in a later cleanup.';
alter table public.spaces add column legal_form text check (
  legal_form is null or legal_form in ('company', 'sole_trader', 'association', 'institute', 'odd', 'private'));
update public.spaces set legal_form = legal_form_v1 where legal_form_v1 is not null;

alter table public.spaces
  add column legal_ack_at timestamptz,
  add column legal_ack_by uuid references public.profiles (id);

create or replace function public.set_space_legal_info(
  p_space uuid, p_form text, p_name text default null, p_address text default null,
  p_registration text default null, p_email text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'acknowledgement_required' using errcode = 'P0001';
end $$;
revoke execute on function public.set_space_legal_info(uuid, text, text, text, text, text) from public, anon, authenticated;

create function public.set_space_legal_info(
  p_space uuid, p_form text, p_ack boolean, p_name text default null, p_address text default null,
  p_registration text default null, p_email text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_space_role(p_space, 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_form is null or p_form not in ('company', 'sole_trader', 'association', 'institute', 'odd', 'private') then
    raise exception 'invalid_legal_form' using errcode = 'P0001';
  end if;
  if p_ack is not true then
    raise exception 'acknowledgement_required' using errcode = 'P0001';
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
  update public.spaces set legal_form = p_form, legal_ack_at = now(), legal_ack_by = auth.uid()
  where id = p_space;
end $$;

revoke execute on function public.set_space_legal_info(uuid, text, boolean, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_space_legal_info(uuid, text, boolean, text, text, text, text) to authenticated;
grant execute on all functions in schema public to service_role;

-- Demo organizers were set up by the seed (test data only).
update public.spaces set legal_ack_at = now() where is_demo and legal_form is not null and legal_ack_at is null;

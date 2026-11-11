-- M1: identity, onboarding, spaces, platform roles, audit log, GDPR requests.
-- Deny-by-default: RLS on every table, explicit grants only (no table-level
-- write grants; sensitive mutations go through SECURITY DEFINER functions).
-- See docs/DOMAIN_MODEL.md and docs/ROUTES_AND_AUTHZ.md.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.profile_visibility as enum ('public', 'members', 'private');
create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.space_kind as enum ('solo_creator', 'community', 'studio', 'association');
create type public.space_role as enum ('owner', 'admin', 'staff', 'member');
create type public.membership_status as enum ('pending', 'active', 'removed');
create type public.membership_mode as enum ('none', 'open', 'approval');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.platform_role as enum ('super_admin', 'admin', 'moderator', 'finance', 'support');
create type public.consent_kind as enum ('marketing_email', 'push', 'approx_location');
create type public.data_request_kind as enum ('export', 'deletion');
create type public.data_request_status as enum ('open', 'in_progress', 'done', 'rejected');

-- ---------------------------------------------------------------------------
-- Shared trigger
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_.]{2,29}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  bio text check (char_length(bio) <= 500),
  approx_city text check (char_length(approx_city) <= 80),
  visibility public.profile_visibility not null default 'members',
  locale text not null default 'sl' check (locale in ('sl', 'en')),
  status public.account_status not null default 'active',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public-facing profile. Email and auth data stay in auth.users and are never exposed here.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile for every new auth user. Never derive anything from the email.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'u' || substr(replace(new.id::text, '-', ''), 1, 11),
    coalesce(nullif(btrim(left(new.raw_user_meta_data ->> 'full_name', 60)), ''), 'Nov uporabnik')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Interests (admin-managed reference data) + onboarding
-- ---------------------------------------------------------------------------
create table public.interests (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label_sl text not null,
  sort smallint not null default 0,
  is_active boolean not null default true
);

create table public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest_id smallint not null references public.interests (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

-- Append-only consent log; current state = latest row per kind.
create table public.user_consents (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  granted boolean not null,
  source text not null default 'app' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
create index user_consents_profile_kind_idx on public.user_consents (profile_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Platform roles + helpers
-- ---------------------------------------------------------------------------
create table public.platform_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active'
  );
$$;

create function public.has_platform_role(roles public.platform_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.platform_roles r
    where r.profile_id = auth.uid() and r.role = any (roles)
  );
$$;

create function public.is_platform_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_platform_role(array['super_admin', 'admin', 'moderator', 'support']::public.platform_role[]);
$$;

-- ---------------------------------------------------------------------------
-- Spaces + memberships (one shared model for all organizer kinds)
-- ---------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$'),
  kind public.space_kind not null,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  tagline text check (char_length(tagline) <= 140),
  bio text check (char_length(bio) <= 2000),
  city text check (char_length(city) <= 80),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  membership_mode public.membership_mode not null default 'none',
  verification_status public.verification_status not null default 'unverified',
  capabilities jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.space_role not null,
  status public.membership_status not null default 'pending',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (space_id, profile_id)
);
create unique index space_members_one_owner_idx on public.space_members (space_id)
  where role = 'owner' and status = 'active';
create index space_members_profile_idx on public.space_members (profile_id) where status <> 'removed';
create trigger space_members_updated_at before update on public.space_members
  for each row execute function public.set_updated_at();

create function public.space_role_rank(r public.space_role) returns int
language sql immutable set search_path = '' as $$
  select case r when 'owner' then 4 when 'admin' then 3 when 'staff' then 2 else 1 end;
$$;

-- True when the current user is an ACTIVE member of the space with at least min_role.
create function public.is_space_role(p_space uuid, min_role public.space_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.space_members m
    where m.space_id = p_space
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and public.space_role_rank(m.role) >= public.space_role_rank(min_role)
  );
$$;

-- Can the current user see this profile? Self, visibility rules, team admins, platform staff.
create function public.can_view_profile(p_profile uuid) returns boolean
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
      -- admins of a space can see the people who are (or are invited to be) in it
      select 1 from public.space_members target
      where target.profile_id = p_profile and target.status <> 'removed'
        and public.is_space_role(target.space_id, 'admin')
    );
$$;

-- ---------------------------------------------------------------------------
-- Audit log (append-only) and GDPR data requests
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

create function public.write_audit(
  p_action text, p_target_type text, p_target_id text, p_reason text, p_before jsonb, p_after jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, reason, before, after)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_reason, p_before, p_after);
$$;

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.data_request_kind not null,
  status public.data_request_status not null default 'open',
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);
create unique index data_requests_one_open_idx on public.data_requests (profile_id, kind)
  where status in ('open', 'in_progress');

-- ---------------------------------------------------------------------------
-- Feature flags (read by everyone, changed only by super admins)
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RPCs: spaces and team
-- ---------------------------------------------------------------------------
create function public.create_space(
  p_kind public.space_kind, p_name text, p_slug text, p_city text default null, p_tagline text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_owned int;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Anti-abuse guard (engineering default, see DECISIONS.md); spaces are free and unrestricted otherwise.
  select count(*) into v_owned from public.space_members
    where profile_id = auth.uid() and role = 'owner' and status = 'active';
  if v_owned >= 20 then
    raise exception 'space_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.spaces (kind, name, slug, city, tagline, created_by, membership_mode)
  values (
    p_kind, btrim(p_name), lower(btrim(p_slug)), nullif(btrim(p_city), ''), nullif(btrim(p_tagline), ''),
    auth.uid(), case when p_kind = 'community' then 'open'::public.membership_mode else 'none' end
  )
  returning id into v_id;

  insert into public.space_members (space_id, profile_id, role, status, invited_by)
  values (v_id, auth.uid(), 'owner', 'active', auth.uid());
  return v_id;
end $$;

-- Invite an existing user (by handle) to the space team. Owner may invite admins; admins may invite staff.
create function public.invite_space_member(p_space uuid, p_handle text, p_role public.space_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
begin
  if p_role = 'owner' then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if not public.is_space_role(p_space, case when p_role = 'admin' then 'owner'::public.space_role else 'admin' end) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select id into v_target from public.profiles where handle = lower(btrim(p_handle)) and status = 'active';
  if v_target is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_target = auth.uid() then
    raise exception 'cannot_invite_self' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, profile_id, role, status, invited_by)
  values (p_space, v_target, p_role, 'pending', auth.uid())
  on conflict (space_id, profile_id) do update
    set role = excluded.role, status = 'pending', invited_by = excluded.invited_by
    where public.space_members.status = 'removed';
  if not found then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
end $$;

create function public.respond_space_invite(p_space uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.space_members
    set status = case when p_accept then 'active'::public.membership_status else 'removed' end
    where space_id = p_space and profile_id = auth.uid() and status = 'pending' and role <> 'owner';
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
end $$;

-- Owner changes roles (never to/from owner here). Admins may not change roles.
create function public.set_space_member_role(p_space uuid, p_profile uuid, p_role public.space_role)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_role = 'owner' or not public.is_space_role(p_space, 'owner') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.space_members set role = p_role
    where space_id = p_space and profile_id = p_profile and role <> 'owner' and status <> 'removed';
  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
end $$;

-- Remove a member. Owner: anyone but self. Admin: staff/members. Anyone: leave (except owner).
create function public.remove_space_member(p_space uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.space_role;
begin
  select role into v_role from public.space_members
    where space_id = p_space and profile_id = p_profile and status <> 'removed';
  if v_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if v_role = 'owner' then
    raise exception 'cannot_remove_owner' using errcode = 'P0001';
  end if;
  if not (
    (p_profile = auth.uid() and public.is_active_user())
    or public.is_space_role(p_space, 'owner')
    or (public.is_space_role(p_space, 'admin') and v_role in ('staff', 'member'))
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.space_members set status = 'removed' where space_id = p_space and profile_id = p_profile;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: admin
-- ---------------------------------------------------------------------------
create function public.admin_set_profile_status(p_profile uuid, p_status public.account_status, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.account_status;
begin
  if not public.has_platform_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_profile = auth.uid() then
    raise exception 'cannot_change_self' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  -- Only super admins may act on other platform staff.
  if exists (select 1 from public.platform_roles where profile_id = p_profile)
     and not public.has_platform_role(array['super_admin']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select status into v_before from public.profiles where id = p_profile for update;
  if v_before is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  update public.profiles set status = p_status where id = p_profile;
  perform public.write_audit('profile.set_status', 'profile', p_profile::text, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end $$;

create function public.admin_resolve_data_request(p_request uuid, p_status public.data_request_status, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.data_request_status;
begin
  if not public.has_platform_role(array['super_admin', 'admin', 'support']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select status into v_before from public.data_requests where id = p_request for update;
  if v_before is null then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  update public.data_requests
    set status = p_status,
        resolved_at = case when p_status in ('done', 'rejected') then now() end,
        resolved_by = case when p_status in ('done', 'rejected') then auth.uid() end
    where id = p_request;
  perform public.write_audit('data_request.set_status', 'data_request', p_request::text, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end $$;

-- Replace the current user's interests atomically (onboarding / settings).
create function public.set_my_interests(p_interest_ids smallint[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce(array_length(p_interest_ids, 1), 0) > 20 then
    raise exception 'too_many_interests' using errcode = 'P0001';
  end if;
  delete from public.profile_interests where profile_id = auth.uid();
  insert into public.profile_interests (profile_id, interest_id)
    select auth.uid(), i.id from public.interests i where i.id = any (p_interest_ids) and i.is_active;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.user_consents enable row level security;
alter table public.platform_roles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.data_requests enable row level security;
alter table public.feature_flags enable row level security;

create policy profiles_select on public.profiles for select using (public.can_view_profile(id));
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());

create policy interests_select on public.interests for select using (is_active or public.is_platform_staff());

create policy profile_interests_select_own on public.profile_interests for select
  using (profile_id = auth.uid() or public.is_platform_staff());

create policy user_consents_select_own on public.user_consents for select
  using (profile_id = auth.uid());
create policy user_consents_insert_own on public.user_consents for insert
  with check (profile_id = auth.uid() and public.is_active_user());

create policy platform_roles_select on public.platform_roles for select
  using (profile_id = auth.uid() or public.has_platform_role(array['super_admin', 'admin']::public.platform_role[]));

create policy spaces_select on public.spaces for select
  using (deleted_at is null or public.is_space_role(id, 'admin') or public.is_platform_staff());
create policy spaces_update_admin on public.spaces for update
  using (public.is_space_role(id, 'admin'))
  with check (public.is_space_role(id, 'admin'));

create policy space_members_select on public.space_members for select
  using (
    profile_id = auth.uid()
    or public.is_space_role(space_id, 'staff')
    or public.is_platform_staff()
  );

create policy audit_select on public.admin_audit_log for select
  using (public.has_platform_role(array['super_admin', 'admin']::public.platform_role[]));

create policy data_requests_select on public.data_requests for select
  using (profile_id = auth.uid() or public.has_platform_role(array['super_admin', 'admin', 'support']::public.platform_role[]));
create policy data_requests_insert_own on public.data_requests for insert
  with check (profile_id = auth.uid() and status = 'open');

create policy feature_flags_select on public.feature_flags for select using (true);

-- ---------------------------------------------------------------------------
-- Grants (explicit; strip any platform defaults first)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.interests, public.spaces, public.feature_flags to anon, authenticated;
grant select (id, handle, display_name, bio, approx_city, visibility, status, created_at) on public.profiles to anon;
grant select on public.profiles to authenticated;
grant update (handle, display_name, bio, approx_city, visibility, locale, onboarded_at) on public.profiles to authenticated;
grant select on public.profile_interests, public.platform_roles, public.space_members,
  public.admin_audit_log, public.data_requests to authenticated;
grant select, insert on public.user_consents to authenticated;
grant insert (profile_id, kind, note) on public.data_requests to authenticated;
grant update (name, tagline, bio, city, social_links, membership_mode) on public.spaces to authenticated;

-- Helper functions used inside RLS policies must be callable by API roles.
grant execute on function public.is_active_user(), public.has_platform_role(public.platform_role[]),
  public.is_platform_staff(), public.space_role_rank(public.space_role),
  public.is_space_role(uuid, public.space_role), public.can_view_profile(uuid) to anon, authenticated;

grant execute on function
  public.create_space(public.space_kind, text, text, text, text),
  public.invite_space_member(uuid, text, public.space_role),
  public.respond_space_invite(uuid, boolean),
  public.set_space_member_role(uuid, uuid, public.space_role),
  public.remove_space_member(uuid, uuid),
  public.admin_set_profile_status(uuid, public.account_status, text),
  public.admin_resolve_data_request(uuid, public.data_request_status, text),
  public.set_my_interests(smallint[])
to authenticated;
-- write_audit, set_updated_at and handle_new_user stay internal (no grants to API roles).

-- service_role (server-only key; used by trusted jobs and test setup) keeps full access.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Reference data (not demo data): interests and feature flags
-- ---------------------------------------------------------------------------
insert into public.interests (slug, label_sl, sort) values
  ('keramika', 'Keramika', 10),
  ('slikanje', 'Slikanje', 20),
  ('risanje', 'Risanje', 30),
  ('rocna-dela', 'Ročna dela', 40),
  ('sivanje', 'Šivanje', 50),
  ('kaligrafija', 'Kaligrafija', 60),
  ('fotografija', 'Fotografija', 70),
  ('dom-in-deko', 'Dom in deko', 80),
  ('cvetlicarstvo', 'Cvetličarstvo', 90),
  ('kulinarika', 'Kulinarika', 100),
  ('gibanje', 'Gibanje in joga', 110),
  ('ples', 'Ples', 120),
  ('glasba', 'Glasba', 130),
  ('pisanje', 'Pisanje', 140),
  ('otroci-in-druzina', 'Otroci in družina', 150);

insert into public.feature_flags (key, enabled, description) values
  ('payments_enabled', false, 'Native paid checkout (M3). Off until legal review and test-mode sign-off.'),
  ('paid_content_enabled', false, 'Paid ideas/courses. Off until seller compliance is in place.'),
  ('messaging_enabled', false, 'User-to-user messages (M3).'),
  ('google_auth_enabled', false, 'Show Google sign-in once OAuth credentials are configured.');

-- M3a: private messages (progressive DMs), blocking, reports + moderation queue, organizer verification.
-- DECISIONS.md: #6 progressive DMs, #9 blocked users keep bookings; block disables DMs between the pair.
-- All writes go through SECURITY DEFINER RPCs; tables have no direct insert/update grants.

create type public.report_target as enum ('profile', 'message', 'event', 'space');
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'scam', 'copyright', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- One 1:1 conversation per pair of people (user_a < user_b keeps the pair unique).
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_sender_id uuid references public.profiles (id) on delete set null,
  a_read_at timestamptz,
  b_read_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_b_idx on public.conversations (user_b, last_message_at desc);
create index conversations_created_by_idx on public.conversations (created_by, created_at);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id),
  -- Removed messages keep no content (the original is kept in the audit log only).
  check ((removed_at is null and char_length(btrim(body)) between 1 and 2000) or (removed_at is not null and body = ''))
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id text not null check (char_length(target_id) <= 64),
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  resolution_note text check (char_length(resolution_note) <= 500)
);
create unique index reports_one_open_idx on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index reports_status_idx on public.reports (status, created_at);

-- New notification kinds.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Provisional (DECISIONS 2026-11-14): accounts older than this may start a conversation with anyone.
create function public.dm_open_after() returns interval
language sql immutable set search_path = '' as $$ select interval '7 days' $$;

create function public.is_blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create function public.is_conversation_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and auth.uid() in (c.user_a, c.user_b)
  );
$$;

-- People in a conversation can see each other's basic profile (name, handle).
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
    )
    or exists (
      select 1 from public.conversations c
      where (c.user_a = auth.uid() and c.user_b = p_profile) or (c.user_b = auth.uid() and c.user_a = p_profile)
    );
$$;

-- Progressive DM rule (DECISIONS #6). First contact is allowed when:
--   the recipient organizes (staff+ in an active space), or
--   the sender organizes a space the recipient booked with, or
--   both are active members of the same space, or
--   the sender's account is older than dm_open_after().
-- Always required: both active, no block either way, recipient profile visible to the sender.
create function public.can_message(p_to uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    auth.uid() is not null
    and p_to <> auth.uid()
    and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = p_to and p.status = 'active')
    and not public.is_blocked_between(auth.uid(), p_to)
    and (
      exists (
        select 1 from public.conversations c
        where c.user_a = least(auth.uid(), p_to) and c.user_b = greatest(auth.uid(), p_to)
      )
      or (
        public.can_view_profile(p_to)
        and (
          exists (
            select 1 from public.space_members m join public.spaces s on s.id = m.space_id
            where m.profile_id = p_to and m.status = 'active' and s.deleted_at is null
              and m.role in ('owner', 'admin', 'staff')
          )
          or exists (
            select 1 from public.bookings b join public.events e on e.id = b.event_id
            where b.booker_id = p_to and public.is_space_role(e.space_id, 'staff')
          )
          or exists (
            select 1 from public.space_members mine join public.space_members theirs on theirs.space_id = mine.space_id
            where mine.profile_id = auth.uid() and mine.status = 'active'
              and theirs.profile_id = p_to and theirs.status = 'active'
          )
          or exists (
            select 1 from public.profiles me
            where me.id = auth.uid() and me.created_at < now() - public.dm_open_after()
          )
        )
      )
    );
$$;

-- Rate limits: 30 messages per 10 minutes, 10 new conversations per 24 hours.
create function public.assert_message_rate() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = auth.uid() and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;

create function public.insert_message(p_conversation uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_message_body' using errcode = 'P0001';
  end if;
  insert into public.messages (conversation_id, sender_id, body) values (p_conversation, auth.uid(), v_body);
  update public.conversations set
    last_message_at = clock_timestamp(),
    last_sender_id = auth.uid(),
    a_read_at = case when user_a = auth.uid() then clock_timestamp() else a_read_at end,
    b_read_at = case when user_b = auth.uid() then clock_timestamp() else b_read_at end
  where id = p_conversation;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: messaging
-- ---------------------------------------------------------------------------
create function public.start_conversation(p_to uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_to = auth.uid() then
    raise exception 'cannot_message_self' using errcode = 'P0001';
  end if;
  if not public.can_message(p_to) then
    raise exception 'cannot_message' using errcode = '42501';
  end if;
  perform public.assert_message_rate();
  select id into v_id from public.conversations
  where user_a = least(auth.uid(), p_to) and user_b = greatest(auth.uid(), p_to);
  if v_id is null then
    if (select count(*) from public.conversations
        where created_by = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    insert into public.conversations (user_a, user_b, created_by)
    values (least(auth.uid(), p_to), greatest(auth.uid(), p_to), auth.uid())
    returning id into v_id;
  end if;
  perform public.insert_message(v_id, p_body);
  return v_id;
end $$;

-- "Piši organizatorju": the conversation goes to the space's active owner.
create function public.contact_space(p_space uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  select m.profile_id into v_owner from public.space_members m join public.spaces s on s.id = m.space_id
  where m.space_id = p_space and m.role = 'owner' and m.status = 'active' and s.deleted_at is null;
  if v_owner is null then
    raise exception 'cannot_message' using errcode = '42501';
  end if;
  if v_owner = auth.uid() then
    raise exception 'cannot_message_self' using errcode = 'P0001';
  end if;
  return public.start_conversation(v_owner, p_body);
end $$;

create function public.send_message(p_conversation uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_conv public.conversations;
  v_other uuid;
begin
  select * into v_conv from public.conversations where id = p_conversation;
  if v_conv.id is null or auth.uid() not in (v_conv.user_a, v_conv.user_b) then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
  v_other := case when v_conv.user_a = auth.uid() then v_conv.user_b else v_conv.user_a end;
  if not public.can_message(v_other) then
    raise exception 'cannot_message' using errcode = '42501';
  end if;
  perform public.assert_message_rate();
  perform public.insert_message(p_conversation, p_body);
end $$;

create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversations set
    a_read_at = case when user_a = auth.uid() then clock_timestamp() else a_read_at end,
    b_read_at = case when user_b = auth.uid() then clock_timestamp() else b_read_at end
  where id = p_conversation and auth.uid() in (user_a, user_b);
$$;

create function public.unread_conversations() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conversations c
  where auth.uid() in (c.user_a, c.user_b)
    and c.last_sender_id is distinct from auth.uid()
    and c.last_sender_id is not null
    and c.last_message_at > coalesce(case when c.user_a = auth.uid() then c.a_read_at else c.b_read_at end, '-infinity');
$$;

create function public.block_user(p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_profile = auth.uid() then
    raise exception 'cannot_block_self' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), p_profile)
  on conflict do nothing;
end $$;

create function public.unblock_user(p_profile uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_profile;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: reports + moderation
-- ---------------------------------------------------------------------------
create function public.report_content(
  p_type public.report_target, p_target text, p_reason public.report_reason, p_details text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_ok boolean;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- The reporter must be able to see what they report (no probing for hidden content).
  v_ok := case p_type
    when 'profile' then exists (select 1 from public.profiles where id::text = p_target and id <> auth.uid())
      and public.can_view_profile(p_target::uuid)
    when 'message' then exists (
      select 1 from public.messages m
      where m.id::text = p_target and m.sender_id <> auth.uid() and public.is_conversation_member(m.conversation_id))
    when 'event' then exists (select 1 from public.events where id::text = p_target and status in ('published', 'cancelled'))
    when 'space' then exists (select 1 from public.spaces where id::text = p_target and deleted_at is null)
  end;
  if not coalesce(v_ok, false) then
    raise exception 'report_target_not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports where reporter_id = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reports where reporter_id = auth.uid() and target_type = p_type
             and target_id = p_target and status = 'open') then
    raise exception 'already_reported' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (auth.uid(), p_type, p_target, p_reason, nullif(btrim(left(p_details, 1000)), ''))
  returning id into v_id;
  return v_id;
end $$;

create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_platform_role(array['super_admin', 'admin', 'moderator']::public.platform_role[]);
$$;

create function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.report_status;
begin
  if not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status = 'open' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_note), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select status into v_before from public.reports where id = p_report for update;
  if v_before is null then
    raise exception 'report_not_found' using errcode = 'P0001';
  end if;
  update public.reports set status = p_status, resolved_at = now(), resolved_by = auth.uid(),
    resolution_note = left(btrim(p_note), 500)
  where id = p_report;
  perform public.write_audit('report.resolve', 'report', p_report::text, p_note,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end $$;

create function public.admin_remove_message(p_message bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_msg public.messages;
begin
  if not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_msg from public.messages where id = p_message for update;
  if v_msg.id is null then
    raise exception 'message_not_found' using errcode = 'P0001';
  end if;
  if v_msg.removed_at is not null then
    return;
  end if;
  update public.messages set body = '', removed_at = now(), removed_by = auth.uid() where id = p_message;
  perform public.write_audit('message.remove', 'message', p_message::text, p_reason,
    jsonb_build_object('sender_id', v_msg.sender_id, 'body', v_msg.body), null);
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: organizer verification
-- ---------------------------------------------------------------------------
create function public.request_space_verification(p_space uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_space_role(p_space, 'owner') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.spaces set verification_status = 'pending'
  where id = p_space and verification_status in ('unverified', 'rejected') and deleted_at is null;
  if not found then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
end $$;

create function public.admin_set_space_verification(
  p_space uuid, p_status public.verification_status, p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_space public.spaces;
  v_owner uuid;
begin
  if not public.has_platform_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('verified', 'rejected', 'unverified') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_space from public.spaces where id = p_space for update;
  if v_space.id is null then
    raise exception 'space_not_found' using errcode = 'P0001';
  end if;
  update public.spaces set verification_status = p_status where id = p_space;
  perform public.write_audit('space.verification', 'space', p_space::text, p_reason,
    jsonb_build_object('verification_status', v_space.verification_status),
    jsonb_build_object('verification_status', p_status));
  select profile_id into v_owner from public.space_members
  where space_id = p_space and role = 'owner' and status = 'active';
  if v_owner is not null and p_status in ('verified', 'rejected') then
    perform public.notify(v_owner, 'verification',
      case when p_status = 'verified' then v_space.name || ' je preverjen organizator'
           else 'Preverjanje prostora ' || v_space.name || ' ni bilo odobreno' end,
      case when p_status = 'rejected' then left(p_reason, 1000) end,
      '/organizator/' || v_space.slug);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;

create policy conversations_select on public.conversations for select
  using (auth.uid() in (user_a, user_b));
-- Moderators see message content only when that message was reported.
create policy messages_select on public.messages for select
  using (
    public.is_conversation_member(conversation_id)
    or (public.is_moderator() and exists (
      select 1 from public.reports r where r.target_type = 'message' and r.target_id = messages.id::text))
  );
create policy user_blocks_select on public.user_blocks for select using (blocker_id = auth.uid());
create policy reports_select on public.reports for select
  using (reporter_id = auth.uid() or public.is_moderator());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.conversations, public.messages, public.user_blocks, public.reports from anon, authenticated;
grant select on public.conversations, public.messages, public.user_blocks, public.reports to authenticated;

revoke execute on function
  public.dm_open_after(), public.is_blocked_between(uuid, uuid), public.is_conversation_member(uuid),
  public.can_message(uuid), public.assert_message_rate(), public.insert_message(uuid, text),
  public.start_conversation(uuid, text), public.contact_space(uuid, text), public.send_message(uuid, text),
  public.mark_conversation_read(uuid), public.unread_conversations(), public.block_user(uuid),
  public.unblock_user(uuid),
  public.report_content(public.report_target, text, public.report_reason, text),
  public.is_moderator(), public.admin_resolve_report(uuid, public.report_status, text),
  public.admin_remove_message(bigint, text), public.request_space_verification(uuid),
  public.admin_set_space_verification(uuid, public.verification_status, text)
from public, anon, authenticated;
grant execute on function
  public.is_conversation_member(uuid), public.can_message(uuid), public.is_moderator(),
  public.start_conversation(uuid, text), public.contact_space(uuid, text), public.send_message(uuid, text),
  public.mark_conversation_read(uuid), public.unread_conversations(), public.block_user(uuid),
  public.unblock_user(uuid),
  public.report_content(public.report_target, text, public.report_reason, text),
  public.admin_resolve_report(uuid, public.report_status, text),
  public.admin_remove_message(bigint, text), public.request_space_verification(uuid),
  public.admin_set_space_verification(uuid, public.verification_status, text)
to authenticated;
-- insert_message, assert_message_rate, is_blocked_between, dm_open_after stay internal.
grant all on public.conversations, public.messages, public.user_blocks, public.reports to service_role;
grant execute on all functions in schema public to service_role;

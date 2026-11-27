-- M11: self-service account deletion (founder 2026-11-26/27: 30 days to change one's mind; bookings/payments stay
-- anonymised for organizers; the person's content is removed). This part: request, cancel, hiding, and foreign
-- keys that keep anonymised records. The final purge is a separate migration. Additive; no row deletes here.

alter table public.profiles add column deletion_requested_at timestamptz;
grant select (deletion_requested_at) on public.profiles to authenticated;

-- Records that must survive as "Izbrisan uporabnik": the link to the person becomes NULL on purge.
alter table public.bookings alter column booker_id drop not null;
alter table public.bookings drop constraint bookings_booker_id_fkey;
alter table public.bookings add constraint bookings_booker_id_fkey
  foreign key (booker_id) references public.profiles (id) on delete set null;
alter table public.passes alter column holder_id drop not null;
alter table public.passes drop constraint passes_holder_id_fkey;
alter table public.passes add constraint passes_holder_id_fkey
  foreign key (holder_id) references public.profiles (id) on delete set null;
alter table public.course_enrollments alter column profile_id drop not null;
alter table public.course_enrollments drop constraint course_enrollments_profile_id_fkey;
alter table public.course_enrollments add constraint course_enrollments_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete set null;

-- References that would otherwise block removing a person ("who did it" becomes unknown).
alter table public.admin_audit_log drop constraint admin_audit_log_actor_id_fkey;
alter table public.admin_audit_log add constraint admin_audit_log_actor_id_fkey
  foreign key (actor_id) references public.profiles (id) on delete set null;
alter table public.bookings drop constraint bookings_payment_confirmed_by_fkey;
alter table public.bookings add constraint bookings_payment_confirmed_by_fkey
  foreign key (payment_confirmed_by) references public.profiles (id) on delete set null;
alter table public.data_requests drop constraint data_requests_resolved_by_fkey;
alter table public.data_requests add constraint data_requests_resolved_by_fkey
  foreign key (resolved_by) references public.profiles (id) on delete set null;
alter table public.events alter column created_by drop not null;
alter table public.events drop constraint events_created_by_fkey;
alter table public.events add constraint events_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;
alter table public.messages drop constraint messages_removed_by_fkey;
alter table public.messages add constraint messages_removed_by_fkey
  foreign key (removed_by) references public.profiles (id) on delete set null;
alter table public.platform_roles drop constraint platform_roles_granted_by_fkey;
alter table public.platform_roles add constraint platform_roles_granted_by_fkey
  foreign key (granted_by) references public.profiles (id) on delete set null;
alter table public.reports drop constraint reports_resolved_by_fkey;
alter table public.reports add constraint reports_resolved_by_fkey
  foreign key (resolved_by) references public.profiles (id) on delete set null;
alter table public.space_legal_info drop constraint space_legal_info_updated_by_fkey;
alter table public.space_legal_info add constraint space_legal_info_updated_by_fkey
  foreign key (updated_by) references public.profiles (id) on delete set null;
alter table public.space_members drop constraint space_members_invited_by_fkey;
alter table public.space_members add constraint space_members_invited_by_fkey
  foreign key (invited_by) references public.profiles (id) on delete set null;
alter table public.spaces alter column created_by drop not null;
alter table public.spaces drop constraint spaces_created_by_fkey;
alter table public.spaces add constraint spaces_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;
alter table public.spaces drop constraint spaces_legal_ack_by_fkey;
alter table public.spaces add constraint spaces_legal_ack_by_fkey
  foreign key (legal_ack_by) references public.profiles (id) on delete set null;

-- Files to remove from storage after a purge (removed by a server job with the storage API).
create table public.storage_cleanup (
  id bigint generated always as identity primary key,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.storage_cleanup enable row level security;
revoke all on public.storage_cleanup from anon, authenticated;
grant all on public.storage_cleanup to service_role;

-- Hide the content of accounts in deletion: ideas (policy) and comments (read functions). Profiles and posts
-- are already hidden for non-active accounts.
create function public.is_profile_shown(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_profile and status <> 'deleted');
$$;
grant execute on function public.is_profile_shown(uuid) to anon, authenticated, service_role;

alter policy ideas_select on public.ideas
  using ((status = 'published' and public.is_profile_shown(author_id)) or author_id = auth.uid() or public.is_moderator());

create or replace function public.post_comments_for(p_post uuid)
 returns table(id bigint, author_id uuid, author_name text, author_handle text, body text, created_at timestamptz,
   removed boolean, can_remove boolean)
 language sql stable security definer set search_path to ''
as $$
  select c.id, c.author_id, a.display_name, a.handle, c.body, c.created_at, c.removed_at is not null,
    (c.removed_at is null and (c.author_id = auth.uid() or p.author_id = auth.uid() or public.is_moderator()))
  from public.post_comments c
    join public.posts p on p.id = c.post_id
    join public.profiles a on a.id = c.author_id
  where c.post_id = p_post and public.can_view_post(p_post)
    and a.status <> 'deleted'
    and not public.is_blocked_between(auth.uid(), c.author_id)
  order by c.created_at
  limit 300;
$$;

create or replace function public.idea_comments_for(p_idea uuid)
 returns table(id bigint, author_id uuid, author_name text, author_handle text, body text, created_at timestamptz,
   removed boolean, can_remove boolean)
 language sql stable security definer set search_path to ''
as $$
  select c.id, c.author_id, a.display_name, a.handle, c.body, c.created_at, c.removed_at is not null,
    (c.removed_at is null and (c.author_id = auth.uid() or i.author_id = auth.uid() or public.is_moderator()))
  from public.idea_comments c
    join public.ideas i on i.id = c.idea_id
    join public.profiles a on a.id = c.author_id
  where c.idea_id = p_idea and auth.uid() is not null
    and (i.status = 'published' or i.author_id = auth.uid() or public.is_moderator())
    and a.status <> 'deleted'
    and not public.is_blocked_between(auth.uid(), c.author_id)
  order by c.created_at
  limit 300;
$$;

-- Request deletion: not while owning a space; cancels future bookings (seats go to the waitlist), hides the account.
create function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.space_members m join public.spaces s on s.id = m.space_id
             where m.profile_id = v_me and m.role = 'owner' and m.status = 'active' and s.deleted_at is null) then
    raise exception 'owns_spaces' using errcode = 'P0001';
  end if;
  update public.bookings b set status = 'cancelled_by_user', cancelled_at = now()
  where b.booker_id = v_me and b.status = 'confirmed'
    and (exists (select 1 from public.event_occurrences o where o.id = b.occurrence_id and o.starts_at > now())
         or (b.occurrence_id is null and exists (select 1 from public.event_occurrences o
             where o.event_id = b.event_id and o.status = 'scheduled' and o.starts_at > now())));
  update public.passes set status = 'cancelled', cancel_reason = 'Kupec je izbrisal račun.'
  where holder_id = v_me and status = 'awaiting';
  update public.course_enrollments set status = 'cancelled', cancel_reason = 'Kupec je izbrisal račun.'
  where profile_id = v_me and status = 'awaiting';
  update public.profiles set status = 'deleted', deletion_requested_at = now() where id = v_me;
  perform public.write_audit('account.deletion_requested', 'profile', v_me::text, 'Samopostrežni izbris', null, null);
  return now() + interval '30 days';
end $$;

-- Change of mind within 30 days (the person can still sign in).
create function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set status = 'active', deletion_requested_at = null
  where id = auth.uid() and status = 'deleted' and deletion_requested_at > now() - interval '30 days';
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform public.write_audit('account.deletion_cancelled', 'profile', auth.uid()::text, 'Preklic izbrisa', null, null);
end $$;

revoke execute on function public.request_account_deletion(), public.cancel_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion(), public.cancel_account_deletion() to authenticated, service_role;

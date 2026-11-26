-- M9: platform admins can suspend a space (studio/community/creator). A suspended space, its events, courses and
-- passes disappear for the public; new bookings, pass purchases and course orders are refused. The space team
-- sees the reason. Additive only; no row deletes.

alter table public.spaces add column suspended_at timestamptz, add column suspended_reason text;
grant select (suspended_at, suspended_reason) on public.spaces to authenticated;

create function public.is_space_live(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.spaces where id = p_space and deleted_at is null and suspended_at is null);
$$;
grant execute on function public.is_space_live(uuid) to anon, authenticated, service_role;

alter policy spaces_select on public.spaces
  using ((deleted_at is null and suspended_at is null) or public.is_space_role(id, 'admin') or public.is_platform_staff());
alter policy events_select on public.events
  using ((status in ('published', 'cancelled') and (visibility::text <> 'members' or public.is_space_role(space_id, 'member'))
          and public.is_space_live(space_id))
    or public.is_space_role(space_id, 'staff') or public.is_platform_staff());
alter policy occurrences_select on public.event_occurrences
  using (exists (select 1 from public.events e where e.id = event_id
    and ((e.status in ('published', 'cancelled') and (e.visibility::text <> 'members' or public.is_space_role(e.space_id, 'member'))
          and public.is_space_live(e.space_id))
      or public.is_space_role(e.space_id, 'staff') or public.is_platform_staff())));
alter policy courses_select on public.courses
  using ((status = 'published' and public.is_space_live(space_id))
    or public.is_space_role(space_id, 'staff') or public.is_platform_staff());
alter policy course_lessons_select on public.course_lessons
  using (removed_at is null and (public.has_course_access(course_id)
         or (is_preview and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'
                                    and public.is_space_live(c.space_id)))));
alter policy pass_types_select on public.pass_types
  using ((active and public.is_space_live(space_id)) or public.is_space_role(space_id, 'staff'));

-- No new bookings, pass orders or course orders in a suspended space (RPCs run as definer, so guard the tables).
create function public.guard_space_live() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_space uuid;
begin
  if tg_table_name = 'bookings' then
    select space_id into v_space from public.events where id = new.event_id;
  elsif tg_table_name = 'course_enrollments' then
    select space_id into v_space from public.courses where id = new.course_id;
  else
    v_space := new.space_id;
  end if;
  if not public.is_space_live(v_space) then
    raise exception 'space_suspended' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger bookings_space_live before insert on public.bookings
  for each row execute function public.guard_space_live();
create trigger passes_space_live before insert on public.passes
  for each row execute function public.guard_space_live();
create trigger course_enrollments_space_live before insert on public.course_enrollments
  for each row execute function public.guard_space_live();

create function public.admin_set_space_suspension(p_space uuid, p_suspend boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_s public.spaces;
  v_owner uuid;
begin
  if not public.has_platform_role(array['super_admin', 'admin']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_s from public.spaces where id = p_space for update;
  if v_s.id is null then
    raise exception 'space_not_found' using errcode = 'P0002';
  end if;
  update public.spaces
    set suspended_at = case when p_suspend then now() end,
        suspended_reason = case when p_suspend then left(btrim(p_reason), 500) end
  where id = p_space;
  perform public.write_audit(case when p_suspend then 'space.suspend' else 'space.unsuspend' end, 'space', p_space::text,
    p_reason, jsonb_build_object('suspended', v_s.suspended_at is not null), jsonb_build_object('suspended', p_suspend));
  select profile_id into v_owner from public.space_members where space_id = p_space and role = 'owner' and status = 'active';
  if v_owner is not null then
    perform public.notify(v_owner, 'verification',
      case when p_suspend then 'Prostor je blokiran: ' else 'Prostor je spet aktiven: ' end || left(v_s.name, 80),
      left(btrim(p_reason), 500), '/organizator/' || v_s.slug);
  end if;
end $$;

revoke execute on function public.guard_space_live(), public.admin_set_space_suspension(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_space_suspension(uuid, boolean, text) to authenticated, service_role;

-- Admin overview of one person (incl. e-mail, which is otherwise not readable): admins and support only, audited.
create function public.admin_user_overview(p_profile uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_out jsonb;
begin
  if not public.has_platform_role(array['super_admin', 'admin', 'support']::public.platform_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'email', (select email from auth.users where id = p_profile),
    'last_sign_in_at', (select last_sign_in_at from auth.users where id = p_profile),
    'bookings', (select count(*) from public.bookings where booker_id = p_profile),
    'bookings_cancelled', (select count(*) from public.bookings where booker_id = p_profile and status <> 'confirmed'),
    'posts', (select count(*) from public.posts where author_id = p_profile),
    'ideas', (select count(*) from public.ideas where author_id = p_profile),
    'comments', (select count(*) from public.post_comments where author_id = p_profile)
               + (select count(*) from public.idea_comments where author_id = p_profile),
    'messages_sent', (select count(*) from public.messages where sender_id = p_profile),
    'reports_against', (select count(*) from public.reports where target_type = 'profile' and target_id = p_profile::text),
    'reports_made', (select count(*) from public.reports where reporter_id = p_profile),
    'blocked_by', (select count(*) from public.user_blocks where blocked_id = p_profile),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'role', m.role,
      'status', m.status) order by s.name) from public.space_members m join public.spaces s on s.id = m.space_id
      where m.profile_id = p_profile and m.status <> 'removed'), '[]'),
    'platform_roles', coalesce((select jsonb_agg(role) from public.platform_roles where profile_id = p_profile), '[]')
  ) into v_out;
  perform public.write_audit('admin.view_user', 'profile', p_profile::text, 'Ogled pregleda osebe', null, null);
  return v_out;
end $$;

-- Admin overview of one space: counts and reports (no personal data beyond what staff already sees).
create function public.admin_space_overview(p_space uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_staff() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'events_published', (select count(*) from public.events where space_id = p_space and status = 'published'),
    'events_total', (select count(*) from public.events where space_id = p_space),
    'courses', (select count(*) from public.courses where space_id = p_space),
    'pass_types', (select count(*) from public.pass_types where space_id = p_space),
    'team', (select count(*) from public.space_members where space_id = p_space and status = 'active' and role <> 'member'),
    'members', (select count(*) from public.space_members where space_id = p_space and status = 'active' and role = 'member'),
    'bookings', (select count(*) from public.bookings b join public.events e on e.id = b.event_id
                 where e.space_id = p_space and b.status = 'confirmed'),
    'reports_against', (select count(*) from public.reports where target_type = 'space' and target_id = p_space::text)
      + (select count(*) from public.reports r join public.events e on r.target_type = 'event' and r.target_id = e.id::text
         where e.space_id = p_space),
    'owner', (select jsonb_build_object('id', p.id, 'handle', p.handle, 'name', p.display_name)
              from public.space_members m join public.profiles p on p.id = m.profile_id
              where m.space_id = p_space and m.role = 'owner' and m.status = 'active')
  );
end $$;

revoke execute on function public.admin_user_overview(uuid), public.admin_space_overview(uuid) from public, anon, authenticated;
grant execute on function public.admin_user_overview(uuid), public.admin_space_overview(uuid) to authenticated, service_role;

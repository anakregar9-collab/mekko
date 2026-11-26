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

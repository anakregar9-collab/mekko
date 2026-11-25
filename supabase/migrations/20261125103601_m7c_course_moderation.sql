-- M7c: courses can be reported and hidden by moderators (like ideas and posts). A course hidden by a moderator
-- cannot be re-published by the organizer. Additive only; no row deletes.

alter type public.report_target add value if not exists 'course';
alter table public.courses add column hidden_reason text;
grant select (hidden_reason) on public.courses to authenticated;

-- Same as M7b plus: a moderator-hidden course stays hidden for the organizer.
create or replace function public.guard_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.space_id <> old.space_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.hidden_reason is distinct from old.hidden_reason and not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if new.status = 'published' and new.hidden_reason is not null and not public.is_moderator() then
    raise exception 'hidden_by_moderator' using errcode = 'P0001';
  end if;
  if new.price_cents is not null and (select legal_form from public.spaces where id = new.space_id) is null then
    raise exception 'legal_info_required' using errcode = 'P0001';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from public.course_lessons where course_id = new.id and youtube_id is not null
                   and removed_at is null) then
      raise exception 'course_needs_lessons' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

-- Same as idea_engagement version plus the 'course' branch (compared as text: the enum value is new).
create or replace function public.report_content(
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
  -- if/elsif (not CASE) so only the matching branch runs (e.g. no uuid cast of a message id).
  if p_type::text = 'profile' then
    v_ok := exists (select 1 from public.profiles where id::text = p_target and id <> auth.uid())
      and public.can_view_profile(p_target::uuid);
  elsif p_type::text = 'message' then
    v_ok := exists (select 1 from public.messages m
      where m.id::text = p_target and m.sender_id <> auth.uid() and public.is_conversation_member(m.conversation_id));
  elsif p_type::text = 'event' then
    v_ok := exists (select 1 from public.events where id::text = p_target and status in ('published', 'cancelled'));
  elsif p_type::text = 'space' then
    v_ok := exists (select 1 from public.spaces where id::text = p_target and deleted_at is null);
  elsif p_type::text = 'idea' then
    v_ok := exists (select 1 from public.ideas where id::text = p_target and status = 'published'
      and author_id <> auth.uid());
  elsif p_type::text = 'post' then
    v_ok := exists (select 1 from public.posts where id::text = p_target and status = 'published'
      and author_id <> auth.uid() and public.can_view_post(id));
  elsif p_type::text = 'comment' then
    v_ok := exists (select 1 from public.post_comments c where c.id::text = p_target and c.removed_at is null
      and c.author_id <> auth.uid() and public.can_view_post(c.post_id));
  elsif p_type::text = 'idea_comment' then
    v_ok := exists (select 1 from public.idea_comments c join public.ideas i on i.id = c.idea_id
      where c.id::text = p_target and c.removed_at is null and c.author_id <> auth.uid() and i.status = 'published');
  elsif p_type::text = 'course' then
    v_ok := exists (select 1 from public.courses c where c.id::text = p_target and c.status = 'published'
      and not public.is_space_role(c.space_id, 'staff'));
  end if;
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

-- Moderator hides (or restores) a course; audited; the space owner is told why.
create function public.admin_set_course_status(p_course uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.courses;
  v_owner uuid;
  v_slug text;
begin
  if not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('published', 'hidden') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_c from public.courses where id = p_course for update;
  if v_c.id is null then
    raise exception 'course_not_found' using errcode = 'P0001';
  end if;
  update public.courses set status = p_status,
    hidden_reason = case when p_status = 'hidden' then left(btrim(p_reason), 500) end
  where id = p_course;
  perform public.write_audit('course.set_status', 'course', p_course::text, p_reason,
    jsonb_build_object('status', v_c.status), jsonb_build_object('status', p_status));
  if p_status = 'hidden' then
    select profile_id into v_owner from public.space_members where space_id = v_c.space_id and role = 'owner' and status = 'active';
    select slug into v_slug from public.spaces where id = v_c.space_id;
    if v_owner is not null then
      perform public.notify(v_owner, 'report_resolved', 'Tečaj je skrit',
        v_c.title || ': ' || left(btrim(p_reason), 500), '/organizator/' || v_slug || '/tecaji/' || v_c.id);
    end if;
  end if;
end $$;

revoke execute on function public.admin_set_course_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_course_status(uuid, text, text) to authenticated, service_role;

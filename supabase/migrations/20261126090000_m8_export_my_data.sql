-- M8: self-service export of one's own personal data (GDPR access/portability), as JSON.
-- Returns only the caller's data; other people appear only by handle where needed to understand a record.
-- Every export is written to the audit log. Additive only; no row deletes.

create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_out jsonb;
begin
  if v_me is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'export_created_at', now(),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = v_me),
    'account_email', (select u.email from auth.users u where u.id = v_me),
    'interests', coalesce((select jsonb_agg(i.label_sl order by i.label_sl) from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id where pi.profile_id = v_me), '[]'),
    'consents', coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted, 'source', c.source,
      'at', c.created_at) order by c.created_at) from public.user_consents c where c.profile_id = v_me), '[]'),
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('event', e.title, 'session_start', o.starts_at,
      'persons', b.quantity, 'note', b.note, 'status', b.status, 'payment_state', b.payment_state,
      'amount_eur', round(b.amount_cents / 100.0, 2), 'with_pass', b.pass_id is not null, 'created_at', b.created_at,
      'cancelled_at', b.cancelled_at,
      'attendance', (select jsonb_agg(jsonb_build_object('session_start', ao.starts_at, 'present', a.present))
                     from public.attendance a join public.event_occurrences ao on ao.id = a.occurrence_id
                     where a.booking_id = b.id)) order by b.created_at)
      from public.bookings b join public.events e on e.id = b.event_id
      left join public.event_occurrences o on o.id = b.occurrence_id where b.booker_id = v_me), '[]'),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object('event', e.title, 'persons', w.quantity,
      'created_at', w.created_at)) from public.event_waitlist w join public.events e on e.id = w.event_id
      where w.profile_id = v_me), '[]'),
    'saved_events', coalesce((select jsonb_agg(e.title) from public.saved_events s join public.events e on e.id = s.event_id
      where s.profile_id = v_me), '[]'),
    'saved_ideas', coalesce((select jsonb_agg(i.title) from public.saved_ideas s join public.ideas i on i.id = s.idea_id
      where s.profile_id = v_me), '[]'),
    'passes', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'space', sp.name, 'visits', x.visits,
      'price_eur', round(x.price_cents / 100.0, 2), 'status', x.status, 'valid_until', x.valid_until,
      'created_at', x.created_at) order by x.created_at) from public.passes x join public.spaces sp on sp.id = x.space_id
      where x.holder_id = v_me), '[]'),
    'courses', coalesce((select jsonb_agg(jsonb_build_object('course', c.title, 'status', ce.status,
      'price_eur', round(ce.price_cents / 100.0, 2), 'created_at', ce.created_at,
      'lessons_done', (select jsonb_agg(l.title) from public.lesson_progress lp join public.course_lessons l on l.id = lp.lesson_id
                       where lp.profile_id = v_me and lp.done and l.course_id = c.id)) order by ce.created_at)
      from public.course_enrollments ce join public.courses c on c.id = ce.course_id where ce.profile_id = v_me), '[]'),
    'space_memberships', coalesce((select jsonb_agg(jsonb_build_object('space', sp.name, 'role', m.role, 'status', m.status,
      'since', m.created_at)) from public.space_members m join public.spaces sp on sp.id = m.space_id
      where m.profile_id = v_me), '[]'),
    'ideas', coalesce((select jsonb_agg(jsonb_build_object('title', i.title, 'summary', i.summary, 'instructions', i.body,
      'materials', i.materials, 'status', i.status, 'created_at', i.created_at) order by i.created_at)
      from public.ideas i where i.author_id = v_me), '[]'),
    'idea_comments', coalesce((select jsonb_agg(jsonb_build_object('idea', i.title, 'text', c.body, 'created_at', c.created_at,
      'removed', c.removed_at is not null) order by c.created_at)
      from public.idea_comments c join public.ideas i on i.id = c.idea_id where c.author_id = v_me), '[]'),
    'idea_likes', coalesce((select jsonb_agg(i.title) from public.idea_likes l join public.ideas i on i.id = l.idea_id
      where l.profile_id = v_me), '[]'),
    'idea_ratings', coalesce((select jsonb_agg(jsonb_build_object('idea', i.title, 'stars', r.stars))
      from public.idea_ratings r join public.ideas i on i.id = r.idea_id where r.profile_id = v_me), '[]'),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('caption', p.caption, 'visibility', p.visibility,
      'status', p.status, 'created_at', p.created_at,
      'photos', (select jsonb_agg(ph.path order by ph.position) from public.post_photos ph where ph.post_id = p.id))
      order by p.created_at) from public.posts p where p.author_id = v_me), '[]'),
    'post_comments', coalesce((select jsonb_agg(jsonb_build_object('text', c.body, 'created_at', c.created_at,
      'removed', c.removed_at is not null) order by c.created_at) from public.post_comments c where c.author_id = v_me), '[]'),
    'post_likes_count', (select count(*) from public.post_likes where profile_id = v_me),
    'following', coalesce((select jsonb_agg(jsonb_build_object('handle', pr.handle, 'status', f.status))
      from public.follows f join public.profiles pr on pr.id = f.followee_id where f.follower_id = v_me), '[]'),
    'followers', coalesce((select jsonb_agg(jsonb_build_object('handle', pr.handle, 'status', f.status))
      from public.follows f join public.profiles pr on pr.id = f.follower_id where f.followee_id = v_me), '[]'),
    'blocked', coalesce((select jsonb_agg(pr.handle) from public.user_blocks b join public.profiles pr on pr.id = b.blocked_id
      where b.blocker_id = v_me), '[]'),
    'messages_sent', coalesce((select jsonb_agg(jsonb_build_object('to', pr.handle, 'text', m.body,
      'sent_at', m.created_at, 'removed', m.removed_at is not null) order by m.created_at)
      from public.messages m join public.conversations cv on cv.id = m.conversation_id
      left join public.profiles pr on pr.id = case when cv.user_a = v_me then cv.user_b else cv.user_a end
      where m.sender_id = v_me), '[]'),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('type', r.target_type, 'reason', r.reason,
      'details', r.details, 'status', r.status, 'created_at', r.created_at) order by r.created_at)
      from public.reports r where r.reporter_id = v_me), '[]'),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('title', n.title, 'text', n.body,
      'created_at', n.created_at, 'read_at', n.read_at) order by n.created_at)
      from public.notifications n where n.recipient_id = v_me), '[]'),
    'data_requests', coalesce((select jsonb_agg(jsonb_build_object('kind', d.kind, 'status', d.status,
      'created_at', d.created_at)) from public.data_requests d where d.profile_id = v_me), '[]')
  ) into v_out;
  return v_out;
end $$;

-- Wrapper that also writes the audit entry (export_my_data is STABLE and cannot write).
create function public.export_my_data_logged() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.admin_audit_log where actor_id = auth.uid() and action = 'data.export_self'
      and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  perform public.write_audit('data.export_self', 'profile', auth.uid()::text, 'Samopostrežni izvoz podatkov',
    null, null);
  return public.export_my_data();
end $$;

revoke execute on function public.export_my_data(), public.export_my_data_logged() from public, anon, authenticated;
grant execute on function public.export_my_data_logged() to authenticated;
grant execute on function public.export_my_data(), public.export_my_data_logged() to service_role;

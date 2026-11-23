-- Discovery performance: seats taken for many events in one call (was one call per card).
-- Returns only aggregate counts for events the caller may see (same rule as events_select). Additive only.
create function public.seats_taken_many(p_events uuid[])
returns table (event_id uuid, occurrence_id uuid, taken int)
language sql stable security definer set search_path = '' as $$
  select b.event_id, b.occurrence_id, coalesce(sum(b.quantity), 0)::int
  from public.bookings b
  join public.events e on e.id = b.event_id
  where b.event_id = any (p_events[1:200])
    and b.status = 'confirmed'
    and e.status = 'published'
    and (e.visibility::text <> 'members' or public.is_space_role(e.space_id, 'member'))
  group by b.event_id, b.occurrence_id;
$$;
revoke execute on function public.seats_taken_many(uuid[]) from public;
grant execute on function public.seats_taken_many(uuid[]) to anon, authenticated, service_role;

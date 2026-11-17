-- Editing published events (founder: "nadaljuj"). Capacity can never go below the seats already taken
-- on any session (or the whole series). Additive only.

create function public.guard_event_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_max_taken int;
begin
  if new.capacity is null or new.capacity is not distinct from old.capacity then
    return new;
  end if;
  select coalesce(max(t), 0) into v_max_taken from (
    select sum(quantity)::int as t from public.bookings
    where event_id = new.id and status = 'confirmed'
    group by occurrence_id
  ) s;
  if new.capacity < v_max_taken then
    raise exception 'capacity_below_bookings' using errcode = 'P0001', detail = v_max_taken::text;
  end if;
  return new;
end $$;
create trigger events_guard_capacity before update of capacity on public.events
  for each row execute function public.guard_event_capacity();

revoke execute on function public.guard_event_capacity() from public, anon, authenticated;

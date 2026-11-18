-- Feed: in-app notifications for likes, comments and follows; people search. Additive.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow'));

-- Like: notify the post author, never for own posts, at most once per liker+post per day (like/unlike spam).
create function public.notify_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
  v_name text;
  v_link text := '/objave/' || new.post_id;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.profile_id then
    return new;
  end if;
  select display_name into v_name from public.profiles where id = new.profile_id;
  if exists (select 1 from public.notifications where recipient_id = v_author and kind = 'social_like'
             and link = v_link and body = v_name and created_at > now() - interval '24 hours') then
    return new;
  end if;
  perform public.notify(v_author, 'social_like', 'Nov všeček', v_name, v_link);
  return new;
end $$;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_post_like();

create function public.notify_post_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
  v_name text;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.author_id then
    return new;
  end if;
  select display_name into v_name from public.profiles where id = new.author_id;
  perform public.notify(v_author, 'social_comment', v_name || ' je komentiral/-a tvojo objavo',
    left(new.body, 200), '/objave/' || new.post_id);
  return new;
end $$;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_post_comment();

-- Follow: new follower, follow request (private profiles), or request accepted (tells the follower).
create function public.notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_follower public.profiles;
  v_followee public.profiles;
begin
  select * into v_follower from public.profiles where id = new.follower_id;
  select * into v_followee from public.profiles where id = new.followee_id;
  if tg_op = 'INSERT' and new.status = 'active' then
    perform public.notify(new.followee_id, 'social_follow', v_follower.display_name || ' ti sledi', null,
      '/u/' || v_follower.handle);
  elsif tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify(new.followee_id, 'social_follow', 'Prošnja za sledenje',
      v_follower.display_name || ' želi slediti tvojim objavam.', '/moj-mekko/sledilci');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'active' then
    perform public.notify(new.follower_id, 'social_follow', v_followee.display_name || ' je sprejel/-a tvojo prošnjo',
      null, '/u/' || v_followee.handle);
  end if;
  return new;
end $$;
create trigger follows_notify after insert or update on public.follows
  for each row execute function public.notify_follow();

-- People search for the feed: name or handle, active accounts, no blocked pairs. Returns no private data.
create function public.search_people(p_query text)
returns table (id uuid, handle text, display_name text, follow_status text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.handle, p.display_name,
    (select f.status from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    p.id = auth.uid()
  from public.profiles p
  where auth.uid() is not null
    and char_length(btrim(coalesce(p_query, ''))) >= 2
    and p.status = 'active' and p.onboarded_at is not null
    and not public.is_blocked_between(auth.uid(), p.id)
    and (p.handle ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '\_') || '%'
         or p.display_name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '\_') || '%')
  order by (p.handle = lower(btrim(p_query))) desc, p.display_name
  limit 30;
$$;

revoke execute on function public.notify_post_like(), public.notify_post_comment(), public.notify_follow(),
  public.search_people(text) from public, anon, authenticated;
grant execute on function public.search_people(text) to authenticated;
grant execute on all functions in schema public to service_role;

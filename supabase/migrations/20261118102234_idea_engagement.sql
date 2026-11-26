-- Ideas: likes, comments/questions and 1–5 star ratings (DECISIONS #4: comments/likes/reviews on ideas).
-- All writes via RPCs; signed-in users read; guests see only counts and the average. Additive only.

create table public.idea_likes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, profile_id)
);

create table public.idea_ratings (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (idea_id, profile_id)
);

create table public.idea_comments (
  id bigint generated always as identity primary key,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check ((removed_at is null and char_length(btrim(body)) between 1 and 1000) or (removed_at is not null and body = ''))
);
create index idea_comments_idea_idx on public.idea_comments (idea_id, created_at);
create index idea_comments_author_idx on public.idea_comments (author_id, created_at);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'booking_confirmed', 'booking_cancelled', 'event_cancelled', 'announcement', 'new_booking',
  'verification', 'report_resolved', 'payment_confirmed', 'booking_released',
  'social_like', 'social_comment', 'social_follow', 'idea_activity'));

-- Can the signed-in user interact with this idea (published, not blocked with the author)?
create function public.can_engage_idea(p_idea uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.is_active_user() and exists (
    select 1 from public.ideas i
    where i.id = p_idea and i.status = 'published'
      and not public.is_blocked_between(auth.uid(), i.author_id)
  );
$$;

create function public.toggle_idea_like(p_idea uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_idea public.ideas;
  v_name text;
begin
  if not public.can_engage_idea(p_idea) then
    raise exception 'idea_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.idea_likes where idea_id = p_idea and profile_id = auth.uid()) then
    delete from public.idea_likes where idea_id = p_idea and profile_id = auth.uid();
    return false;
  end if;
  insert into public.idea_likes (idea_id, profile_id) values (p_idea, auth.uid());
  select * into v_idea from public.ideas where id = p_idea;
  if v_idea.author_id <> auth.uid() then
    select display_name into v_name from public.profiles where id = auth.uid();
    if not exists (select 1 from public.notifications where recipient_id = v_idea.author_id and kind = 'idea_activity'
                   and link = '/ideje/' || v_idea.slug and body = v_name || ' je všečkal/-a tvojo idejo.'
                   and created_at > now() - interval '24 hours') then
      perform public.notify(v_idea.author_id, 'idea_activity', v_idea.title, v_name || ' je všečkal/-a tvojo idejo.',
        '/ideje/' || v_idea.slug);
    end if;
  end if;
  return true;
end $$;

-- One rating per person, changeable; authors cannot rate their own ideas.
create function public.rate_idea(p_idea uuid, p_stars int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_idea public.ideas;
  v_new boolean;
  v_name text;
begin
  if not public.can_engage_idea(p_idea) then
    raise exception 'idea_not_found' using errcode = 'P0001';
  end if;
  if p_stars not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = 'P0001';
  end if;
  select * into v_idea from public.ideas where id = p_idea;
  if v_idea.author_id = auth.uid() then
    raise exception 'cannot_rate_own' using errcode = 'P0001';
  end if;
  v_new := not exists (select 1 from public.idea_ratings where idea_id = p_idea and profile_id = auth.uid());
  insert into public.idea_ratings (idea_id, profile_id, stars) values (p_idea, auth.uid(), p_stars)
  on conflict (idea_id, profile_id) do update set stars = excluded.stars, updated_at = now();
  if v_new then
    select display_name into v_name from public.profiles where id = auth.uid();
    perform public.notify(v_idea.author_id, 'idea_activity', v_idea.title,
      v_name || ' je ocenil/-a tvojo idejo: ' || p_stars || '/5.', '/ideje/' || v_idea.slug);
  end if;
end $$;

create function public.add_idea_comment(p_idea uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
  v_idea public.ideas;
  v_name text;
begin
  if not public.can_engage_idea(p_idea) then
    raise exception 'idea_not_found' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 1000 then
    raise exception 'invalid_comment' using errcode = 'P0001';
  end if;
  if (select count(*) from public.idea_comments where author_id = auth.uid() and created_at > now() - interval '1 hour')
     + (select count(*) from public.post_comments where author_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.idea_comments (idea_id, author_id, body) values (p_idea, auth.uid(), btrim(p_body))
  returning id into v_id;
  select * into v_idea from public.ideas where id = p_idea;
  if v_idea.author_id <> auth.uid() then
    select display_name into v_name from public.profiles where id = auth.uid();
    perform public.notify(v_idea.author_id, 'idea_activity', v_name || ' je komentiral/-a tvojo idejo',
      left(btrim(p_body), 200), '/ideje/' || v_idea.slug);
  end if;
  return v_id;
end $$;

create function public.remove_idea_comment(p_comment bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.idea_comments;
  v_idea_author uuid;
begin
  select * into v_c from public.idea_comments where id = p_comment for update;
  if v_c.id is null or v_c.removed_at is not null then
    raise exception 'comment_not_found' using errcode = 'P0001';
  end if;
  select author_id into v_idea_author from public.ideas where id = v_c.idea_id;
  if auth.uid() not in (v_c.author_id, v_idea_author) and not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.idea_comments set body = '', removed_at = now() where id = p_comment;
  if public.is_moderator() and auth.uid() not in (v_c.author_id, v_idea_author) then
    perform public.write_audit('idea_comment.remove', 'idea_comment', p_comment::text, 'moderation',
      jsonb_build_object('author_id', v_c.author_id, 'body', v_c.body), null);
  end if;
end $$;

-- Counts + my state for many ideas at once. Guests get counts and averages (no identities).
create function public.idea_stats(p_ideas uuid[])
returns table (idea_id uuid, like_count int, comment_count int, rating_avg numeric, rating_count int,
  liked_by_me boolean, my_rating int)
language sql stable security definer set search_path = '' as $$
  select i.id,
    (select count(*)::int from public.idea_likes l where l.idea_id = i.id),
    (select count(*)::int from public.idea_comments c where c.idea_id = i.id and c.removed_at is null),
    (select round(avg(r.stars)::numeric, 1) from public.idea_ratings r where r.idea_id = i.id),
    (select count(*)::int from public.idea_ratings r where r.idea_id = i.id),
    exists (select 1 from public.idea_likes l where l.idea_id = i.id and l.profile_id = auth.uid()),
    (select r.stars::int from public.idea_ratings r where r.idea_id = i.id and r.profile_id = auth.uid())
  from public.ideas i
  where i.id = any (p_ideas) and i.status = 'published';
$$;

create function public.idea_comments_for(p_idea uuid)
returns table (id bigint, author_id uuid, author_name text, author_handle text, body text, created_at timestamptz,
  removed boolean, can_remove boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.author_id, a.display_name, a.handle, c.body, c.created_at, c.removed_at is not null,
    (c.removed_at is null and (c.author_id = auth.uid() or i.author_id = auth.uid() or public.is_moderator()))
  from public.idea_comments c
    join public.ideas i on i.id = c.idea_id
    join public.profiles a on a.id = c.author_id
  where c.idea_id = p_idea and auth.uid() is not null
    and (i.status = 'published' or i.author_id = auth.uid() or public.is_moderator())
    and not public.is_blocked_between(auth.uid(), c.author_id)
  order by c.created_at
  limit 300;
$$;

-- Reports can target idea comments.
alter type public.report_target add value if not exists 'idea_comment';

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

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.idea_likes enable row level security;
alter table public.idea_ratings enable row level security;
alter table public.idea_comments enable row level security;

create policy idea_likes_select on public.idea_likes for select using (profile_id = auth.uid() or public.is_moderator());
create policy idea_ratings_select on public.idea_ratings for select using (profile_id = auth.uid() or public.is_moderator());
create policy idea_comments_select on public.idea_comments for select
  using (auth.uid() is not null and exists (select 1 from public.ideas i where i.id = idea_id
    and (i.status = 'published' or i.author_id = auth.uid() or public.is_moderator())));

revoke all on public.idea_likes, public.idea_ratings, public.idea_comments from anon, authenticated;
grant select on public.idea_likes, public.idea_ratings, public.idea_comments to authenticated;
grant all on public.idea_likes, public.idea_ratings, public.idea_comments to service_role;

revoke execute on function public.can_engage_idea(uuid), public.toggle_idea_like(uuid), public.rate_idea(uuid, int),
  public.add_idea_comment(uuid, text), public.remove_idea_comment(bigint), public.idea_stats(uuid[]),
  public.idea_comments_for(uuid)
from public, anon, authenticated;
grant execute on function public.toggle_idea_like(uuid), public.rate_idea(uuid, int), public.add_idea_comment(uuid, text),
  public.remove_idea_comment(bigint), public.idea_comments_for(uuid) to authenticated;
grant execute on function public.idea_stats(uuid[]) to anon, authenticated;
grant execute on all functions in schema public to service_role;

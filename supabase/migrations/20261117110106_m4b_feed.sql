-- M4b: Ustvarjalni feed (founder 2026-11-17). Follows like Instagram (private profiles approve), posts with
-- 1–5 photos visible to all signed-in users or followers only, likes, comments, reports + moderation.
-- No recognisable children (author confirms; moderators hide violations). Posts don't count toward quota;
-- anti-spam limits instead. All writes via SECURITY DEFINER RPCs. Additive only.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text check (char_length(caption) <= 2200),
  visibility text not null default 'public' check (visibility in ('public', 'followers')),
  idea_id uuid references public.ideas (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  hidden_reason text check (char_length(hidden_reason) <= 500),
  created_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (created_at desc) where status = 'published';
create index posts_author_idx on public.posts (author_id, created_at desc);

create table public.post_photos (
  post_id uuid not null references public.posts (id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  path text not null check (path ~ '^[0-9a-f-]{36}/[a-z0-9]{8,40}\.(jpg|png|webp)$'),
  primary key (post_id, position)
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index post_likes_profile_idx on public.post_likes (profile_id);

create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check ((removed_at is null and char_length(btrim(body)) between 1 and 1000) or (removed_at is not null and body = ''))
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
create index post_comments_author_idx on public.post_comments (author_id, created_at);

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
create function public.is_following(p_followee uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.follows
    where follower_id = auth.uid() and followee_id = p_followee and status = 'active');
$$;

-- Signed-in users see published posts that are public, or followers-only posts of people they follow.
-- Blocks hide posts both ways. Authors always see their own; moderators see everything.
create function public.can_view_post(p_post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts p join public.profiles a on a.id = p.author_id
    where p.id = p_post and (
      p.author_id = auth.uid()
      or public.is_moderator()
      or (
        auth.uid() is not null and p.status = 'published' and a.status = 'active'
        and not public.is_blocked_between(auth.uid(), p.author_id)
        and (p.visibility = 'public' or public.is_following(p.author_id))
        -- private profiles: only approved followers see their posts
        and (a.visibility <> 'private' or public.is_following(p.author_id))
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs: follows
-- ---------------------------------------------------------------------------
create function public.follow_user(p_profile uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_vis public.profile_visibility;
  v_status text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_profile = auth.uid() then
    raise exception 'cannot_follow_self' using errcode = 'P0001';
  end if;
  select visibility into v_vis from public.profiles where id = p_profile and status = 'active';
  if v_vis is null or public.is_blocked_between(auth.uid(), p_profile) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.follows where follower_id = auth.uid() and created_at > now() - interval '24 hours') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  v_status := case when v_vis = 'private' then 'pending' else 'active' end;
  insert into public.follows (follower_id, followee_id, status) values (auth.uid(), p_profile, v_status)
  on conflict (follower_id, followee_id) do nothing;
  select status into v_status from public.follows where follower_id = auth.uid() and followee_id = p_profile;
  return v_status;
end $$;

create function public.unfollow_user(p_profile uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.follows where follower_id = auth.uid() and followee_id = p_profile;
$$;

-- Private profiles approve or decline pending followers; anyone can remove a follower.
create function public.respond_follow(p_follower uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_accept then
    update public.follows set status = 'active'
    where follower_id = p_follower and followee_id = auth.uid() and status = 'pending';
  else
    delete from public.follows where follower_id = p_follower and followee_id = auth.uid();
  end if;
end $$;

-- Blocking someone also ends follows in both directions.
create function public.end_follows_on_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;
create trigger user_blocks_end_follows after insert on public.user_blocks
  for each row execute function public.end_follows_on_block();

-- ---------------------------------------------------------------------------
-- RPCs: posts
-- ---------------------------------------------------------------------------
create function public.create_post(
  p_caption text, p_visibility text, p_paths text[], p_no_children boolean,
  p_idea uuid default null, p_event uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_path text;
  v_pos int := 0;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_no_children is not true then
    raise exception 'children_confirmation_required' using errcode = 'P0001';
  end if;
  if p_visibility not in ('public', 'followers') then
    raise exception 'invalid_visibility' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_paths, 1), 0) not between 1 and 5 then
    raise exception 'photos_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.posts where author_id = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  foreach v_path in array p_paths loop
    if split_part(v_path, '/', 1) <> auth.uid()::text then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end loop;
  if p_idea is not null and not exists (select 1 from public.ideas where id = p_idea and status = 'published') then
    p_idea := null;
  end if;
  if p_event is not null and not exists (select 1 from public.events where id = p_event and status in ('published', 'cancelled')) then
    p_event := null;
  end if;
  insert into public.posts (author_id, caption, visibility, idea_id, event_id)
  values (auth.uid(), nullif(btrim(left(p_caption, 2200)), ''), p_visibility, p_idea, p_event)
  returning id into v_id;
  foreach v_path in array p_paths loop
    insert into public.post_photos (post_id, position, path) values (v_id, v_pos, v_path);
    v_pos := v_pos + 1;
  end loop;
  return v_id;
end $$;

-- Authors remove their own posts (kept as 'removed' so reports keep their context; photos stay private to staff).
create function public.remove_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.posts set status = 'removed' where id = p_post and author_id = auth.uid() and status <> 'removed';
  if not found then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;
end $$;

create function public.toggle_like(p_post uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active_user() or not public.can_view_post(p_post) then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.post_likes where post_id = p_post and profile_id = auth.uid()) then
    delete from public.post_likes where post_id = p_post and profile_id = auth.uid();
    return false;
  end if;
  insert into public.post_likes (post_id, profile_id) values (p_post, auth.uid());
  return true;
end $$;

create function public.add_comment(p_post uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
  v_author uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.can_view_post(p_post) then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;
  select author_id into v_author from public.posts where id = p_post;
  if public.is_blocked_between(auth.uid(), v_author) then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 1000 then
    raise exception 'invalid_comment' using errcode = 'P0001';
  end if;
  if (select count(*) from public.post_comments where author_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.post_comments (post_id, author_id, body) values (p_post, auth.uid(), btrim(p_body))
  returning id into v_id;
  return v_id;
end $$;

-- A comment can be removed by its author, by the post's author, or by a moderator (audited).
create function public.remove_comment(p_comment bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.post_comments;
  v_post_author uuid;
begin
  select * into v_c from public.post_comments where id = p_comment for update;
  if v_c.id is null or v_c.removed_at is not null then
    raise exception 'comment_not_found' using errcode = 'P0001';
  end if;
  select author_id into v_post_author from public.posts where id = v_c.post_id;
  if auth.uid() not in (v_c.author_id, v_post_author) and not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.post_comments set body = '', removed_at = now() where id = p_comment;
  if public.is_moderator() and auth.uid() not in (v_c.author_id, v_post_author) then
    perform public.write_audit('comment.remove', 'comment', p_comment::text, 'moderation',
      jsonb_build_object('author_id', v_c.author_id, 'body', v_c.body), null);
  end if;
end $$;

create function public.admin_set_post_status(p_post uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_post public.posts;
begin
  if not public.is_moderator() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('published', 'hidden') or nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_post from public.posts where id = p_post for update;
  if v_post.id is null then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;
  update public.posts set status = p_status,
    hidden_reason = case when p_status = 'hidden' then left(btrim(p_reason), 500) end
  where id = p_post;
  perform public.write_audit('post.set_status', 'post', p_post::text, p_reason,
    jsonb_build_object('status', v_post.status), jsonb_build_object('status', p_status));
  if p_status = 'hidden' then
    perform public.notify(v_post.author_id, 'report_resolved', 'Objava je skrita', left(btrim(p_reason), 500), '/feed');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Read RPCs (one round trip with counts; visibility enforced inside)
-- ---------------------------------------------------------------------------
create function public.feed_posts(p_scope text, p_author uuid default null, p_before timestamptz default null,
  p_limit int default 20)
returns table (
  id uuid, author_id uuid, author_name text, author_handle text, caption text, visibility text,
  idea_slug text, idea_title text, event_slug text, event_title text, created_at timestamptz,
  photos text[], like_count int, comment_count int, liked_by_me boolean, status text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.author_id, a.display_name, a.handle, p.caption, p.visibility,
    i.slug, i.title, e.slug, e.title, p.created_at,
    array(select ph.path from public.post_photos ph where ph.post_id = p.id order by ph.position),
    (select count(*)::int from public.post_likes l where l.post_id = p.id),
    (select count(*)::int from public.post_comments c where c.post_id = p.id and c.removed_at is null),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.profile_id = auth.uid()),
    p.status
  from public.posts p
    join public.profiles a on a.id = p.author_id
    left join public.ideas i on i.id = p.idea_id and i.status = 'published'
    left join public.events e on e.id = p.event_id and e.status in ('published', 'cancelled')
  where auth.uid() is not null
    and p.status <> 'removed'
    and (p.status = 'published' or p.author_id = auth.uid())
    and public.can_view_post(p.id)
    and (p_before is null or p.created_at < p_before)
    and case p_scope
      when 'following' then p.author_id = auth.uid() or public.is_following(p.author_id)
      when 'author' then p.author_id = p_author
      when 'single' then p.id = p_author  -- p_author carries the post id for a single post
      else true
    end
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

create function public.post_comments_for(p_post uuid)
returns table (id bigint, author_id uuid, author_name text, author_handle text, body text, created_at timestamptz,
  removed boolean, can_remove boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.author_id, a.display_name, a.handle, c.body, c.created_at, c.removed_at is not null,
    (c.removed_at is null and (c.author_id = auth.uid() or p.author_id = auth.uid() or public.is_moderator()))
  from public.post_comments c
    join public.posts p on p.id = c.post_id
    join public.profiles a on a.id = c.author_id
  where c.post_id = p_post and public.can_view_post(p_post)
    and not public.is_blocked_between(auth.uid(), c.author_id)
  order by c.created_at
  limit 300;
$$;

-- Public-ish profile card for the feed: name, handle, bio and counts (no email, city or other data).
create function public.feed_profile(p_handle text)
returns table (id uuid, handle text, display_name text, bio text, visibility text, posts int, followers int,
  following int, follow_status text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select pr.id, pr.handle, pr.display_name, pr.bio, pr.visibility::text,
    (select count(*)::int from public.posts p where p.author_id = pr.id and p.status = 'published'),
    (select count(*)::int from public.follows f where f.followee_id = pr.id and f.status = 'active'),
    (select count(*)::int from public.follows f where f.follower_id = pr.id and f.status = 'active'),
    (select f.status from public.follows f where f.follower_id = auth.uid() and f.followee_id = pr.id),
    pr.id = auth.uid()
  from public.profiles pr
  where auth.uid() is not null and pr.handle = lower(p_handle) and pr.status = 'active'
    and not public.is_blocked_between(auth.uid(), pr.id);
$$;

-- ---------------------------------------------------------------------------
-- Reports: posts and comments
-- ---------------------------------------------------------------------------
alter type public.report_target add value if not exists 'post';
alter type public.report_target add value if not exists 'comment';

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
-- RLS + grants (tables are read through RLS; every write goes through the RPCs above)
-- ---------------------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

create policy follows_select on public.follows for select
  using (follower_id = auth.uid() or followee_id = auth.uid() or public.is_moderator());
create policy posts_select on public.posts for select using (public.can_view_post(id));
create policy post_photos_select on public.post_photos for select using (public.can_view_post(post_id));
create policy post_likes_select on public.post_likes for select using (public.can_view_post(post_id));
create policy post_comments_select on public.post_comments for select using (public.can_view_post(post_id));

revoke all on public.follows, public.posts, public.post_photos, public.post_likes, public.post_comments
  from anon, authenticated;
grant select on public.follows, public.posts, public.post_photos, public.post_likes, public.post_comments
  to authenticated;
grant all on public.follows, public.posts, public.post_photos, public.post_likes, public.post_comments
  to service_role;

revoke execute on function
  public.is_following(uuid), public.can_view_post(uuid), public.follow_user(uuid), public.unfollow_user(uuid),
  public.respond_follow(uuid, boolean), public.end_follows_on_block(),
  public.create_post(text, text, text[], boolean, uuid, uuid), public.remove_post(uuid), public.toggle_like(uuid),
  public.add_comment(uuid, text), public.remove_comment(bigint), public.admin_set_post_status(uuid, text, text),
  public.feed_posts(text, uuid, timestamptz, int), public.post_comments_for(uuid), public.feed_profile(text)
from public, anon, authenticated;
grant execute on function
  public.is_following(uuid), public.can_view_post(uuid), public.follow_user(uuid), public.unfollow_user(uuid),
  public.respond_follow(uuid, boolean),
  public.create_post(text, text, text[], boolean, uuid, uuid), public.remove_post(uuid), public.toggle_like(uuid),
  public.add_comment(uuid, text), public.remove_comment(bigint), public.admin_set_post_status(uuid, text, text),
  public.feed_posts(text, uuid, timestamptz, int), public.post_comments_for(uuid), public.feed_profile(text)
to authenticated;
grant execute on all functions in schema public to service_role;

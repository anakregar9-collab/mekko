-- M4 (first slice): free ideas — publish, discover, save, report, moderate.
-- Founder: anyone registered can publish ideas (DECISIONS #4); paid ideas only after legal review (#10).
-- Same categories and the "Za začetnike" / "Za otroke" attributes as events. Photos and PDFs come with
-- Storage in a later slice. Additive only: no destructive statements.

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$'),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  summary text check (char_length(summary) <= 200),
  body text not null check (char_length(btrim(body)) between 20 and 10000),
  materials text check (char_length(materials) <= 1000),
  time_needed text check (char_length(time_needed) <= 60),
  external_url text check (external_url is null or (external_url ~ '^https://' and char_length(external_url) <= 500)),
  interest_id smallint references public.interests (id),
  cover text not null default 'sun' check (cover in ('coral', 'sun', 'sage', 'lilac', 'sky', 'clay')),
  beginner_friendly boolean not null default false,
  family_friendly boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden')),
  hidden_reason text check (char_length(hidden_reason) <= 500),
  is_demo boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_published_idx on public.ideas (published_at desc) where status = 'published';
create index ideas_author_idx on public.ideas (author_id);
create trigger ideas_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

create table public.saved_ideas (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, idea_id)
);

-- Authors cannot un-hide a moderated idea or change moderation fields.
create function public.ideas_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Server-side jobs/seed (no signed-in user) and moderators are trusted.
  if auth.uid() is null or public.is_moderator() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'published';
    new.hidden_reason := null;
    new.is_demo := false;
    new.published_at := now();
  elsif new.status is distinct from old.status or new.hidden_reason is distinct from old.hidden_reason
        or new.is_demo is distinct from old.is_demo or new.author_id is distinct from old.author_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger ideas_guard before insert or update on public.ideas
  for each row execute function public.ideas_guard();

-- Moderator hides or restores an idea (audited; author is notified).
create function public.admin_set_idea_status(p_idea uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_idea public.ideas;
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
  select * into v_idea from public.ideas where id = p_idea for update;
  if v_idea.id is null then
    raise exception 'idea_not_found' using errcode = 'P0001';
  end if;
  update public.ideas set status = p_status,
    hidden_reason = case when p_status = 'hidden' then left(btrim(p_reason), 500) end
  where id = p_idea;
  perform public.write_audit('idea.set_status', 'idea', p_idea::text, p_reason,
    jsonb_build_object('status', v_idea.status), jsonb_build_object('status', p_status));
  if p_status = 'hidden' then
    perform public.notify(v_idea.author_id, 'report_resolved', 'Ideja je skrita',
      v_idea.title || ': ' || left(btrim(p_reason), 500), '/moj-mekko/ideje');
  end if;
end $$;

-- Public author name of published ideas only (authors chose to publish; nothing else from the profile).
create function public.idea_authors(p_ideas uuid[]) returns table (idea_id uuid, display_name text, handle text)
language sql stable security definer set search_path = '' as $$
  select i.id, p.display_name, p.handle
  from public.ideas i join public.profiles p on p.id = i.author_id
  where i.id = any (p_ideas) and i.status = 'published' and p.status = 'active';
$$;

-- Reports can target ideas.
alter type public.report_target add value if not exists 'idea';

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
alter table public.ideas enable row level security;
alter table public.saved_ideas enable row level security;

create policy ideas_select on public.ideas for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy ideas_insert on public.ideas for insert
  with check (author_id = auth.uid() and public.is_active_user());
create policy ideas_update on public.ideas for update
  using ((author_id = auth.uid() and public.is_active_user()) or public.is_moderator())
  with check ((author_id = auth.uid() and public.is_active_user()) or public.is_moderator());

create policy saved_ideas_select on public.saved_ideas for select using (profile_id = auth.uid());
create policy saved_ideas_insert on public.saved_ideas for insert
  with check (profile_id = auth.uid() and public.is_active_user());

revoke all on public.ideas, public.saved_ideas from anon, authenticated;
-- Guests see a preview only (no instructions, materials or link) — same rule as events.
grant select (id, author_id, slug, title, summary, time_needed, interest_id, cover, beginner_friendly,
  family_friendly, status, is_demo, published_at) on public.ideas to anon;
grant select on public.ideas to authenticated;
grant insert (author_id, slug, title, summary, body, materials, time_needed, external_url, interest_id, cover,
  beginner_friendly, family_friendly) on public.ideas to authenticated;
grant update (title, summary, body, materials, time_needed, external_url, interest_id, cover,
  beginner_friendly, family_friendly, status, hidden_reason) on public.ideas to authenticated;
grant select, insert on public.saved_ideas to authenticated;
grant all on public.ideas, public.saved_ideas to service_role;

revoke execute on function public.ideas_guard(), public.admin_set_idea_status(uuid, text, text),
  public.idea_authors(uuid[]) from public, anon, authenticated;
grant execute on function public.idea_authors(uuid[]) to anon, authenticated;
-- RLS on ideas calls is_moderator() for guests too (always false for them).
grant execute on function public.is_moderator() to anon;
grant execute on function public.admin_set_idea_status(uuid, text, text) to authenticated;
grant execute on all functions in schema public to service_role;

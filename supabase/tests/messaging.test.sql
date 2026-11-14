-- RLS / authorization tests: progressive DMs, blocks, reports, moderation, organizer verification.
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

create temp table ids (name text primary key, id text);
grant select, insert on ids to authenticated, anon;

create function pg_temp.mk_user(p_handle text) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), p_handle || '@example.test', 'authenticated', 'authenticated', '{}'::jsonb)
  returning id into v;
  update public.profiles set handle = p_handle, onboarded_at = now() where id = v;
  return v;
end $$;
create function pg_temp.act_as(p_name text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from ids where name = p_name), 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.act_root() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;
create function pg_temp.id(p_name text) returns uuid language sql as $$
  select id::uuid from ids where name = p_name;
$$;
create function pg_temp.v(p_name text) returns text language sql as $$
  select id from ids where name = p_name;
$$;

insert into ids values
  ('org', pg_temp.mk_user('dm_org')),
  ('ana', pg_temp.mk_user('dm_ana')),
  ('bor', pg_temp.mk_user('dm_bor')),
  ('cene', pg_temp.mk_user('dm_cene')),
  ('star', pg_temp.mk_user('dm_star')),
  ('mod', pg_temp.mk_user('dm_mod')),
  ('adm', pg_temp.mk_user('dm_adm'));
-- "star" is an established account (older than dm_open_after()).
update public.profiles set created_at = now() - interval '30 days' where id = pg_temp.id('star');
insert into public.platform_roles (profile_id, role) values (pg_temp.id('mod'), 'moderator'), (pg_temp.id('adm'), 'admin');

-- Organizer space + published event; cene books it.
select pg_temp.act_as('org');
insert into ids values ('space', public.create_space('studio', 'Glina DM', 'glina-dm-pgtap')::text);
select pg_temp.act_root();
with e as (
  insert into public.events (space_id, created_by, slug, title, capacity, max_per_booking)
  values (pg_temp.id('space'), pg_temp.id('org'), 'dm-test-dogodek', 'DM test', 10, 2) returning id)
insert into ids select 'event', id::text from e;
with o as (
  insert into public.event_occurrences (event_id, starts_at, ends_at)
  values (pg_temp.id('event'), now() + interval '7 days', now() + interval '7 days 2 hours') returning id)
insert into ids select 'occ', id::text from o;
select pg_temp.act_as('org');
select public.publish_event(pg_temp.id('event'));
select pg_temp.act_as('cene');
select public.book_event(pg_temp.id('event'), pg_temp.id('occ'), 1);

-- Progressive first contact ---------------------------------------------------------
select pg_temp.act_as('ana');
select ok(not public.can_message(pg_temp.id('bor')), 'new accounts cannot cold-message strangers');
select throws_ok($$ select public.start_conversation(pg_temp.id('bor'), 'Živjo') $$, '42501', null,
  'start_conversation enforces the first-contact rule');
select ok(public.can_message(pg_temp.id('org')), 'anyone can write to an organizer');
select throws_ok($$ select public.start_conversation(pg_temp.id('ana'), 'jaz') $$, 'P0001', 'cannot_message_self',
  'cannot message yourself');
select throws_ok($$ select public.contact_space(pg_temp.id('space'), '   ') $$, 'P0001', 'invalid_message_body',
  'empty messages are rejected');
insert into ids select 'conv', public.contact_space(pg_temp.id('space'), 'Ali so še prosta mesta?')::text;
select is((select count(*)::int from public.conversations where id = pg_temp.id('conv')), 1, 'sender sees the conversation');
select is((select count(*)::int from public.messages where conversation_id = pg_temp.id('conv')), 1, 'sender sees the message');
select is(public.contact_space(pg_temp.id('space'), 'Še eno vprašanje')::text, pg_temp.v('conv'),
  'writing again reuses the same conversation');

select pg_temp.act_as('org');
select is(public.unread_conversations(), 1, 'organizer has one unread conversation');
select lives_ok($$ select public.send_message(pg_temp.id('conv'), 'Ja, še tri.') $$, 'organizer replies');
select is(public.unread_conversations(), 0, 'own reply does not count as unread');
select ok(public.can_message(pg_temp.id('cene')), 'organizer can write to someone who booked their event');
select ok(not public.can_message(pg_temp.id('bor')), 'organizer cannot cold-message non-attendees');

select pg_temp.act_as('ana');
select is(public.unread_conversations(), 1, 'reply shows as unread for ana');
select public.mark_conversation_read(pg_temp.id('conv'));
select is(public.unread_conversations(), 0, 'marking read clears the badge');

select pg_temp.act_as('bor');
select is((select count(*)::int from public.conversations where id = pg_temp.id('conv')), 0, 'outsiders cannot see the conversation');
select is((select count(*)::int from public.messages where conversation_id = pg_temp.id('conv')), 0, 'outsiders cannot read messages');
select throws_ok($$ select public.send_message(pg_temp.id('conv'), 'vdor') $$, 'P0001', 'conversation_not_found',
  'outsiders cannot post into a conversation');
select throws_ok($$ insert into public.messages (conversation_id, sender_id, body) values (pg_temp.id('conv'), auth.uid(), 'x') $$,
  '42501', null, 'no direct inserts into messages');
select throws_ok($$ update public.conversations set a_read_at = now() $$, '42501', null, 'no direct updates to conversations');

-- Established accounts, private profiles, blocks -----------------------------------
select pg_temp.act_as('star');
select ok(public.can_message(pg_temp.id('bor')), 'established accounts can write to anyone');
select pg_temp.act_root();
update public.profiles set visibility = 'private' where id = pg_temp.id('bor');
select pg_temp.act_as('star');
select ok(not public.can_message(pg_temp.id('bor')), 'private profiles cannot be cold-messaged');
select pg_temp.act_root();
update public.profiles set visibility = 'members' where id = pg_temp.id('bor');
select pg_temp.act_as('star');
insert into ids select 'conv2', public.start_conversation(pg_temp.id('bor'), 'Kupi poceni sledilce!')::text;
insert into ids select 'spam', (select max(id) from public.messages where conversation_id = pg_temp.id('conv2'))::text;

select pg_temp.act_as('bor');
select lives_ok($$ select public.block_user(pg_temp.id('star')) $$, 'bor blocks star');
select is((select count(*)::int from public.user_blocks where blocked_id = pg_temp.id('star')), 1, 'bor sees own block');
select throws_ok($$ select public.send_message(pg_temp.id('conv2'), 'nehaj') $$, '42501', null, 'blocker cannot write either');
select pg_temp.act_as('star');
select throws_ok($$ select public.send_message(pg_temp.id('conv2'), 'še enkrat') $$, '42501', null, 'blocked user cannot write');
select is((select count(*)::int from public.user_blocks), 0, 'blocked user cannot see who blocked them');

-- Reports + moderation ---------------------------------------------------------------
select pg_temp.act_as('bor');
select lives_ok($$ select public.report_content('message', pg_temp.v('spam'), 'spam', 'Neželena reklama') $$, 'bor reports the spam message');
select throws_ok($$ select public.report_content('message', pg_temp.v('spam'), 'spam') $$, 'P0001', 'already_reported',
  'duplicate open reports are rejected');
select pg_temp.act_as('ana');
select throws_ok($$ select public.report_content('message', pg_temp.v('spam'), 'spam') $$, 'P0001', 'report_target_not_found',
  'cannot report messages outside your conversations');
select is((select count(*)::int from public.reports), 0, 'users see only their own reports');

select pg_temp.act_as('mod');
select is((select count(*)::int from public.messages where id = pg_temp.v('spam')::bigint), 1, 'moderator can read a reported message');
select is((select count(*)::int from public.messages where conversation_id = pg_temp.id('conv')), 0,
  'moderator cannot read unreported conversations');
select throws_ok($$ select public.admin_remove_message(pg_temp.v('spam')::bigint, '') $$, 'P0001', 'reason_required',
  'removal needs a reason');
select lives_ok($$ select public.admin_remove_message(pg_temp.v('spam')::bigint, 'Spam') $$, 'moderator removes the message');
select lives_ok($$ select public.admin_resolve_report((select id from public.reports where target_id = pg_temp.v('spam')), 'actioned', 'Odstranjeno') $$,
  'moderator resolves the report');
select pg_temp.act_root();
select is((select count(*)::int from public.admin_audit_log where action in ('message.remove', 'report.resolve')), 2, 'moderation is audited');
select pg_temp.act_as('mod');
select pg_temp.act_as('star');
select is((select body from public.messages where id = pg_temp.v('spam')::bigint), '', 'removed message content is gone');
select throws_ok($$ select public.admin_resolve_report(gen_random_uuid(), 'dismissed', 'x') $$, '42501', null,
  'non-moderators cannot resolve reports');

-- Rate limit -------------------------------------------------------------------------
select pg_temp.act_root();
insert into public.messages (conversation_id, sender_id, body)
select pg_temp.id('conv'), pg_temp.id('ana'), 'msg ' || g from generate_series(1, 30) g;
select pg_temp.act_as('ana');
select throws_ok($$ select public.send_message(pg_temp.id('conv'), 'preveč') $$, 'P0001', 'rate_limited',
  'more than 30 messages in 10 minutes is rate limited');

-- Organizer verification -------------------------------------------------------------
select throws_ok($$ select public.request_space_verification(pg_temp.id('space')) $$, '42501', null,
  'only the owner can request verification');
select pg_temp.act_as('org');
select lives_ok($$ select public.request_space_verification(pg_temp.id('space')) $$, 'owner requests verification');
select pg_temp.act_as('mod');
select throws_ok($$ select public.admin_set_space_verification(pg_temp.id('space'), 'verified', 'ok') $$, '42501', null,
  'moderators cannot verify organizers');
select pg_temp.act_as('adm');
select public.admin_set_space_verification(pg_temp.id('space'), 'verified', 'Preverjeno po telefonu');
select pg_temp.act_as('org');
select is((select count(*)::int from public.notifications where kind = 'verification'), 1, 'owner is notified about verification');

select * from finish();
rollback;

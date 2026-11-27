-- M11 part 2: final removal of accounts 30 days after the person asked for deletion (daily, pg_cron).
-- Removing the auth user removes the profile and, through the foreign keys, the person's content (ideas, posts,
-- comments, likes, follows, messages, saved items, notifications, consents); bookings, passes and course orders
-- stay as "Izbrisan uporabnik" (link set to NULL, booking notes cleared). Photo files are queued for removal from
-- storage. Each removal is written to the audit log (without the person's name).

create function public.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.profiles
    where status = 'deleted' and deletion_requested_at is not null
      and deletion_requested_at <= now() - interval '30 days'
    limit 200
  loop
    insert into public.storage_cleanup (bucket, path)
      select 'covers', ph.path from public.post_photos ph join public.posts p on p.id = ph.post_id
      where p.author_id = r.id
      union all
      select 'covers', i.cover_image_path from public.ideas i where i.author_id = r.id and i.cover_image_path is not null;
    update public.bookings set note = null where booker_id = r.id;
    perform public.write_audit('account.purged', 'profile', r.id::text, 'Izbris po 30 dneh', null, null);
    delete from auth.users where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts() to service_role;

select cron.schedule('mekko-purge-deleted-accounts', '17 3 * * *', $$select public.purge_deleted_accounts()$$);

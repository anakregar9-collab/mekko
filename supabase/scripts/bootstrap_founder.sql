-- One-off: grant the founder the super_admin platform role.
-- Run MANUALLY, only with founder approval, AFTER the founder has signed in once.
--   psql "$DB_URL" -v email='founder@example.com' -f supabase/scripts/bootstrap_founder.sql
-- (or paste into the Supabase SQL editor, replacing :'email' with the quoted address)
begin;

insert into public.platform_roles (profile_id, role)
select u.id, 'super_admin'
from auth.users u
where u.email = :'email'
on conflict do nothing;

insert into public.admin_audit_log (actor_id, action, target_type, target_id, reason, after)
select null, 'platform_role.grant', 'profile', u.id::text, 'Founder bootstrap', jsonb_build_object('role', 'super_admin')
from auth.users u
where u.email = :'email';

-- Must print exactly one row; otherwise ROLLBACK and check the address.
select p.handle, r.role from public.platform_roles r join public.profiles p on p.id = r.profile_id
where r.profile_id = (select id from auth.users where email = :'email');

commit;

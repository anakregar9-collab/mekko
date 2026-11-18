-- Terms of use + privacy policy acceptance (pre-launch). Stores which version a user accepted and when.
-- Additive only.
alter table public.profiles
  add column terms_version text check (terms_version is null or terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[a-z0-9-]*$'),
  add column terms_accepted_at timestamptz;
grant update (terms_version, terms_accepted_at) on public.profiles to authenticated;

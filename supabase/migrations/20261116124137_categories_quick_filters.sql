-- Founder 2026-11-16: broader categories shared by events and ideas, plus quick filters
-- (Za začetnike · Online · Za otroke · Ta vikend). Additive only (see M3e note).

-- 1. Nine broad categories. Existing rows are reused/relabelled; merged ones are deactivated and remapped.
update public.interests set slug = 'umetnost', label_sl = 'Umetnost in risanje', sort = 10 where slug = 'slikanje';
update public.interests set label_sl = 'Keramika in kiparstvo', sort = 20 where slug = 'keramika';
update public.interests set label_sl = 'Ročna dela in tekstil', sort = 30 where slug = 'rocna-dela';
update public.interests set label_sl = 'Dom, deko in rastline', sort = 40 where slug = 'dom-in-deko';
update public.interests set label_sl = 'Kulinarika', sort = 50 where slug = 'kulinarika';
update public.interests set label_sl = 'Gibanje in dobro počutje', sort = 60 where slug = 'gibanje';
update public.interests set slug = 'glasba-in-ples', label_sl = 'Glasba in ples', sort = 70 where slug = 'glasba';
update public.interests set slug = 'foto-in-digitalno', label_sl = 'Foto in digitalno', sort = 80 where slug = 'fotografija';
update public.interests set slug = 'pisanje-in-jezik', label_sl = 'Pisanje in jezik', sort = 90 where slug = 'pisanje';

-- Merged categories (old slug → new slug; null = becomes the quick filter "Za otroke").
update public.events e set interest_id = n.id
from (values ('risanje', 'umetnost'), ('kaligrafija', 'umetnost'), ('sivanje', 'rocna-dela'),
             ('cvetlicarstvo', 'dom-in-deko'), ('ples', 'glasba-in-ples'), ('otroci-in-druzina', null))
       as m(old_slug, new_slug)
  join public.interests o on o.slug = m.old_slug
  left join public.interests n on n.slug = m.new_slug
where e.interest_id = o.id;

insert into public.profile_interests (profile_id, interest_id)
select pi.profile_id, n.id
from public.profile_interests pi
  join public.interests o on o.id = pi.interest_id
  join (values ('risanje', 'umetnost'), ('kaligrafija', 'umetnost'), ('sivanje', 'rocna-dela'),
               ('cvetlicarstvo', 'dom-in-deko'), ('ples', 'glasba-in-ples')) as m(old_slug, new_slug)
    on m.old_slug = o.slug
  join public.interests n on n.slug = m.new_slug
on conflict do nothing;

-- Old selections stay as inactive rows (never shown; replaced on the next save of "Zanimanja").

update public.interests set is_active = false
where slug in ('risanje', 'kaligrafija', 'sivanje', 'cvetlicarstvo', 'ples', 'otroci-in-druzina');

-- 2. Event attributes behind the quick filters "Za začetnike" and "Za otroke".
alter table public.events
  add column beginner_friendly boolean not null default false,
  add column family_friendly boolean not null default false;
grant select (beginner_friendly, family_friendly) on public.events to anon, authenticated;
grant insert (beginner_friendly, family_friendly), update (beginner_friendly, family_friendly)
  on public.events to authenticated;

-- Test content only.
update public.events set beginner_friendly = true
where is_demo and slug in ('keramika-za-zacetnike', 'vecer-akvarela-ob-caju', 'tecaj-pletenja-4-srecanja',
  'online-osnove-kaligrafije', 'kvackanje-ob-kavi', 'tkanje-na-statvah', 'svece-iz-sojinega-voska');
update public.events set family_friendly = true
where is_demo and slug in ('jutranja-joga-na-krasu', 'svece-iz-sojinega-voska', 'kvackanje-ob-kavi');

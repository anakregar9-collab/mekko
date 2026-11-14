-- TEST CONTENT for development / testing environments only (never production data).
-- Every row is flagged is_demo = true and shown with a "Testni" badge in the app.
-- Idempotent: safe to run more than once. Dates are relative to now(), so events stay upcoming.
-- Demo organizer accounts have no password and cannot sign in.

insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at)
values
  ('a1000000-0000-4000-8000-000000000000', 'glinena.hisa@demo.mekko.invalid', 'authenticated', 'authenticated', '{"full_name":"Glinena hiša"}', now()),
  ('a2000000-0000-4000-8000-000000000000', 'krozek.nitka@demo.mekko.invalid', 'authenticated', 'authenticated', '{"full_name":"Krožek Nitka"}', now()),
  ('a3000000-0000-4000-8000-000000000000', 'ana.rise@demo.mekko.invalid', 'authenticated', 'authenticated', '{"full_name":"Ana Riše"}', now()),
  ('a4000000-0000-4000-8000-000000000000', 'ustvarjalni.kras@demo.mekko.invalid', 'authenticated', 'authenticated', '{"full_name":"Društvo Ustvarjalni Kras"}', now())
on conflict (id) do nothing;

update public.profiles set
  handle = case id
    when 'a1000000-0000-4000-8000-000000000000' then 'glinena.hisa'
    when 'a2000000-0000-4000-8000-000000000000' then 'krozek.nitka'
    when 'a3000000-0000-4000-8000-000000000000' then 'ana.rise'
    else 'ustvarjalni.kras' end,
  visibility = 'public',
  onboarded_at = coalesce(onboarded_at, now())
where id in ('a1000000-0000-4000-8000-000000000000', 'a2000000-0000-4000-8000-000000000000',
             'a3000000-0000-4000-8000-000000000000', 'a4000000-0000-4000-8000-000000000000');

insert into public.spaces (id, slug, kind, name, tagline, bio, city, membership_mode, verification_status, created_by, is_demo)
values
  ('b1000000-0000-4000-8000-000000000000', 'glinena-hisa', 'studio', 'Glinena hiša',
   'Keramični studio za začetnike in vse, ki radi umažejo roke.',
   'Majhen studio v središču Ljubljane z dvema lončarskima vretenoma in pečjo. Delavnice vodimo v skupinah do osem ljudi.',
   'Ljubljana', 'none', 'verified', 'a1000000-0000-4000-8000-000000000000', true),
  ('b2000000-0000-4000-8000-000000000000', 'krozek-nitka', 'community', 'Krožek Nitka',
   'Skupnost pletilk in kvačkarjev vseh starosti.',
   'Srečujemo se ob torkih v celjski knjižnici. Začetniki so vedno dobrodošli.',
   'Celje', 'open', 'unverified', 'a2000000-0000-4000-8000-000000000000', true),
  ('b3000000-0000-4000-8000-000000000000', 'ana-rise', 'solo_creator', 'Ana Riše',
   'Akvarel, kaligrafija in počasni ustvarjalni večeri.',
   'Ilustratorka iz Maribora. Delavnice v živo in online.',
   'Maribor', 'none', 'verified', 'a3000000-0000-4000-8000-000000000000', true),
  ('b4000000-0000-4000-8000-000000000000', 'drustvo-ustvarjalni-kras', 'association', 'Društvo Ustvarjalni Kras',
   'Delavnice, gibanje in druženje na Krasu.',
   'Neprofitno društvo, ki povezuje ustvarjalce s Krasa in Brkinov.',
   'Sežana', 'open', 'verified', 'a4000000-0000-4000-8000-000000000000', true)
on conflict (id) do nothing;

insert into public.space_members (space_id, profile_id, role, status, invited_by)
select s.id, s.created_by, 'owner', 'active', s.created_by
from public.spaces s where s.is_demo
on conflict (space_id, profile_id) do nothing;

-- Events -------------------------------------------------------------------------
with ev(id, space, slug, title, summary, description, interest, schedule, online, mode, ext, city, address, cap, maxp, materials, policy, cover) as (
  values
  ('c1000000-0000-4000-8000-000000000000'::uuid, 'b1000000-0000-4000-8000-000000000000'::uuid, 'keramika-za-zacetnike',
   'Keramika za začetnike', 'Spoznaj vretenje in oblikuj svojo prvo skodelico.',
   E'Na triurni delavnici se naučiš osnov centriranja gline in vretenja.\nIzdelke po žganju prevzameš v studiu čez dva tedna.',
   'keramika', 'one_off', false, 'native', null, 'Ljubljana', 'Trubarjeva cesta 12, 1000 Ljubljana', 8, 2,
   E'Predpasnik ali stara oblačila\nGlina in orodje sta vključena', 'moderate', 'clay'),
  ('c2000000-0000-4000-8000-000000000000'::uuid, 'b3000000-0000-4000-8000-000000000000'::uuid, 'vecer-akvarela-ob-caju',
   'Večer akvarela ob čaju', 'Sproščen večer slikanja jesenskih motivov.',
   'Vodeno slikanje za vse ravni. Pripravimo papir, barve in čopiče, ti prineseš dobro voljo.',
   'slikanje', 'one_off', false, 'native', null, 'Maribor', 'Poštna ulica 3, 2000 Maribor', 12, 2,
   'Vse potrebščine so vključene', 'flexible', 'sky'),
  ('c3000000-0000-4000-8000-000000000000'::uuid, 'b2000000-0000-4000-8000-000000000000'::uuid, 'tecaj-pletenja-4-srecanja',
   'Tečaj pletenja – 4 srečanja', 'Od prve zanke do lastne kape v štirih tednih.',
   'Večkratni tečaj: z eno prijavo se udeležiš vseh štirih srečanj. Vsa srečanja se ti prikažejo v koledarju.',
   'rocna-dela', 'multi_session', false, 'native', null, 'Celje', 'Knjižnica Celje, Muzejski trg 1a, 3000 Celje', 10, 1,
   E'Volna srednje debeline\nPletilki št. 5', 'strict', 'lilac'),
  ('c4000000-0000-4000-8000-000000000000'::uuid, 'b4000000-0000-4000-8000-000000000000'::uuid, 'jutranja-joga-na-krasu',
   'Jutranja joga na Krasu', 'Jutranja vadba enkrat na teden – prijava za posamezen termin.',
   'Ob slabem vremenu vadimo v dvorani društva. Primerno za vse starosti.',
   'gibanje', 'one_off', false, 'native', null, 'Sežana', 'Park pri gradu, 6210 Sežana', 20, 2,
   E'Lastna podloga\nTopla oblačila', 'flexible', 'sage'),
  ('c5000000-0000-4000-8000-000000000000'::uuid, 'b3000000-0000-4000-8000-000000000000'::uuid, 'online-osnove-kaligrafije',
   'Online: osnove kaligrafije', 'Živa spletna delavnica za popolne začetnike.',
   'Povezavo do spletne sobe vidiš po prijavi. Potrebuješ le flomaster s čopičasto konico in papir.',
   'kaligrafija', 'one_off', true, 'native', null, null, null, null, 1,
   E'Čopičasti flomaster\nGladek papir A4', 'flexible', 'sun'),
  ('c6000000-0000-4000-8000-000000000000'::uuid, 'b4000000-0000-4000-8000-000000000000'::uuid, 'svece-iz-sojinega-voska',
   'Sveče iz sojinega voska', 'Izdelaj dve dišeči sveči za darilo.',
   'Prijava poteka na spletni strani društva.',
   'dom-in-deko', 'one_off', false, 'external', 'https://example.org/prijava-svece', 'Sežana', null, null, 1,
   null, 'flexible', 'coral'),
  ('c7000000-0000-4000-8000-000000000000'::uuid, 'b1000000-0000-4000-8000-000000000000'::uuid, 'vretenje-nadaljevalni',
   'Vretenje – nadaljevalni tečaj', 'Tri srečanja za tiste, ki že poznajo osnove.',
   'Delamo višje oblike, ročaje in glaziranje. Ena prijava velja za vsa tri srečanja.',
   'keramika', 'multi_session', false, 'native', null, 'Ljubljana', 'Trubarjeva cesta 12, 1000 Ljubljana', 6, 1,
   'Predpasnik', 'moderate', 'clay'),
  ('c8000000-0000-4000-8000-000000000000'::uuid, 'b2000000-0000-4000-8000-000000000000'::uuid, 'kvackanje-ob-kavi',
   'Kvačkanje ob kavi', 'Druženje in pomoč pri tvojem projektu.',
   'Neformalno srečanje: prinesi svoj projekt ali začni novega. Pomagamo pri vzorcih.',
   'rocna-dela', 'one_off', false, 'native', null, 'Celje', 'Kavarna Pod lipo, Glavni trg 4, 3000 Celje', null, 3,
   'Kvačka in preja (nekaj imamo za izposojo)', 'flexible', 'lilac')
)
insert into public.events (id, space_id, created_by, slug, title, summary, description, interest_id, schedule, booking_scope,
  is_online, registration_mode, external_url, city, address, online_url, capacity, max_per_booking, materials,
  cancellation_policy, cover, status, is_demo, published_at)
select ev.id, ev.space, s.created_by, ev.slug, ev.title, ev.summary, ev.description,
  (select id from public.interests i where i.slug = ev.interest),
  ev.schedule::public.event_schedule,
  case when ev.schedule = 'multi_session' then 'series' else 'occurrence' end::public.booking_scope,
  ev.online, ev.mode::public.registration_mode, ev.ext, ev.city, ev.address,
  case when ev.online then 'https://meet.example.org/mekko-test' end,
  ev.cap, ev.maxp, ev.materials, ev.policy::public.cancellation_policy, ev.cover, 'published', true, now()
from ev join public.spaces s on s.id = ev.space
on conflict (id) do nothing;

-- Occurrences (only if the event has none yet) --------------------------------------
with occ(event_id, day_offset, start_time, minutes) as (
  values
  ('c1000000-0000-4000-8000-000000000000'::uuid, 5, '10:00', 180),
  ('c1000000-0000-4000-8000-000000000000'::uuid, 19, '10:00', 180),
  ('c2000000-0000-4000-8000-000000000000'::uuid, 9, '18:00', 150),
  ('c3000000-0000-4000-8000-000000000000'::uuid, 7, '17:00', 120),
  ('c3000000-0000-4000-8000-000000000000'::uuid, 14, '17:00', 120),
  ('c3000000-0000-4000-8000-000000000000'::uuid, 21, '17:00', 120),
  ('c3000000-0000-4000-8000-000000000000'::uuid, 28, '17:00', 120),
  ('c4000000-0000-4000-8000-000000000000'::uuid, 3, '08:00', 60),
  ('c4000000-0000-4000-8000-000000000000'::uuid, 10, '08:00', 60),
  ('c4000000-0000-4000-8000-000000000000'::uuid, 17, '08:00', 60),
  ('c5000000-0000-4000-8000-000000000000'::uuid, 12, '19:00', 90),
  ('c6000000-0000-4000-8000-000000000000'::uuid, 16, '16:00', 120),
  ('c7000000-0000-4000-8000-000000000000'::uuid, 11, '18:00', 150),
  ('c7000000-0000-4000-8000-000000000000'::uuid, 18, '18:00', 150),
  ('c7000000-0000-4000-8000-000000000000'::uuid, 25, '18:00', 150),
  ('c8000000-0000-4000-8000-000000000000'::uuid, 6, '10:00', 120),
  ('c8000000-0000-4000-8000-000000000000'::uuid, 13, '10:00', 120)
)
insert into public.event_occurrences (event_id, starts_at, ends_at)
select o.event_id,
  ((current_date + o.day_offset)::text || ' ' || o.start_time)::timestamp at time zone 'Europe/Ljubljana',
  ((current_date + o.day_offset)::text || ' ' || o.start_time)::timestamp at time zone 'Europe/Ljubljana'
    + make_interval(mins => o.minutes)
from occ o
where not exists (select 1 from public.event_occurrences x where x.event_id = o.event_id);

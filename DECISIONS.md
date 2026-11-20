# MEKKO decision log
2026-11-11 — Founder-confirmed planning sections:
1. Positioning: discover creativity + lifestyle, Slovenia first; Revelie separate.
2. Accounts: visitor preview then sign-in for details; all creator types supported; personal account + organizer mode; multiple spaces, initially unrestricted free; creator profile info.
3. Events: one-off, multi-session, recurring, online, private; native/external booking, free/paid/ticket categories/manual private payments, capacity/waitlist/deadlines/group bookings, map/reminders/messages/materials, standard cancellation templates, user list+calendar.
4. Ideas: photo/description, PDF and external guide; all users can post; free/paid, save/library; comments/likes/customer photos/reviews; recorded video courses; future native physical shop; personalized ideas.
5. Spaces: community, studio, association, solo creator; membership, private groups, community feed, events; studio staffing, scheduling, attendance, financial view, passes, courses; open/closed memberships; owner + admins; free spaces first, member/non-member content access.
6. Monetization: variable commission (exact TBD) paid by organizer + future premium features; free posting limited by quantity; paid community dues later; manual + online checkout; acquisition first then monetize stronger.
7. UX: playful creative, social-feed-style discovery, four main tabs; mobile-first visitor and desktop-optimized organizer; personalization interests/saves/location; light mode; separate organizer workspace; Slovene first.
8. Comms/trust: email contact and direct DM; TWO header icons (messages and notifications); transactional notices; user-to-user messaging; report/block/moderate/spam defenses/verify organizers; profile privacy controls; marketing opt-in.
9. Admin: users/organizers/events/sales/revenue/issues; suspend, roles, deletion, risk-based moderation; variable pricing/quotas/categories/promo/flags; transaction/refund/export/fraud visibility; support email+tickets; hybrid editorial recommendations; extensible admin roles.
10. Build mode: Claude Code; MVP as soon as practical; email + Google authentication.

## Clarifications / apparent conflicts resolved
- Section 2 said spaces limited; Section 5 superseded: free multiple spaces initially, restrict later.
- Earlier communities envisioned fees; Section 6 superseded: paid membership dues later.
- Earlier one combined comms icon superseded by Section 8: two icons.
- Profile discovery no follower/review system yet, but idea ratings/reviews confirmed.
- Section 4 said no physical shop until later; full native checkout is FUTURE design, not launch scope.
- Section 2 says organizer mode; Section 7 specified separate organizer dashboard, not a separate account.

## Still requires founder decision / validation
- Commission % and if processor fee is separately allocated; exact pricing tiers and post quotas.
- Formal MVP scope and launch gates for waitlists, comments, courses and chat.
- Legal seller eligibility, KYC, invoicing, taxes, EU consumer obligations, payouts.
- Public SEO previews vs user requirement to gate event/content detail pages.
- How free social posting quota applies to community posts vs published ideas/events.
- What happens to external booking listings when platform commission model expands.
- User approval of design system / logos / typography / colors.

## 2026-11-11 — M0 engineering decisions (proposed by Claude Code, pending founder review)
- Stack pinned: Next.js 16.4 (App Router, Cache Components), React 19.3, TypeScript 5.9, Tailwind 4.3, pnpm 10.28, Node ≥ 22, Vitest 5, Playwright 1.63 + axe-core.
- shadcn/ui registry unreachable from build environment; M0 uses small hand-written primitives in the same style. Recommend adopting shadcn/Radix for forms/dialogs in M1.
- Events, tickets, bookings and payouts always belong to a space; organizer mode auto-creates a `solo_creator` space (docs/M0_REVIEW.md #5).
- Series bookings use `bookings.occurrence_id = NULL`; recurring events book per occurrence (docs/DOMAIN_MODEL.md).
- Prototype screens live under `/prototip/*`, are `noindex` and always show a demo banner; unimplemented actions explain themselves instead of being dead buttons.
- Proposed defaults for spec contradictions are listed in docs/M0_REVIEW.md §2; items marked APPROVAL are NOT confirmed.
- First-pass branding (coral/cream palette, Bricolage Grotesque + Figtree) is a placeholder, not approved.

## 2026-11-11 — Founder decisions on M0 review (docs/M0_REVIEW.md §2) — CONFIRMED
1. Event previews: public, indexable preview (title, cover, date/time, city, organizer, price range, category, availability). Exact address, online link, full description, materials, organizer contact and booking require login.
2. Posting quota: counts published events + published ideas (not community posts, not drafts), per account and per space; initially unlimited, admin-configurable later; never charged/unpublished retroactively.
3. External registration: allowed, clearly labelled "Zunanja prijava" with leaving-Mekko notice; counts toward quota; no hidden ranking penalty; outbound clicks tracked.
4. Manual/off-platform payment: booking `pending_payment` until organizer confirms; Mekko never shows "plačano"; no commission on manual payments in MVP.
6. DMs (M3): progressive — first contact only to organizers or people sharing a booking/membership, open to all after account age/verification; with rate limits, report and block.
7. Community membership: no pricing section until paid dues exist; only "Pridruži se" / "Zaprosi za članstvo".
9. Blocked/suspended users: existing bookings stay valid; block disables DMs/comments between the pair; organizer safety removal = full refund; suspended users cannot book; existing bookings flagged for admin review.
10. Sales (paid tickets, paid ideas): only after legal review (KYC, invoicing, VAT, consumer rights); until then free events/ideas and manual-payment events only; afterwards verified sellers only.

Infrastructure (approved):
- Create Supabase dev project in EU (Frankfurt), development only, no real data.
- Connect Vercel for preview deployments only; no production.
- Auth M1: email first; Google OAuth added when founder provides client credentials.
- Email provider: Resend. Domain: mekko.eu (registered at Domenca).

Design:
- Overall visual direction approved (cream background, coral actions, rounded cards, Bricolage Grotesque + Figtree).
- Old logo (two overlapping circles) rejected: looked like the Mastercard logo. Replaced with a creative hand-drawn "m" mark with a curled thread tail and a sun sparkle (`src/components/logo.tsx`), pending founder confirmation.

## 2026-11-11 — M1 engineering decisions (Claude Code; inside confirmed scope)
- Login = email one-time 6-digit code (Supabase OTP) instead of magic links: works across devices/in-app browsers and needs no redirect allow-list. Google sign-in added when OAuth credentials exist (flag `google_auth_enabled`).
- Profile visibility default = "members" (signed-in users only). Email, purchases and bookings are never part of a profile. Approximate city is stored only with an explicit `approx_location` consent; consents are an append-only log. Marketing email is opt-in, off by default.
- Team membership requires the invitee to accept (no one is added to a space without consent). Owner invites admins; admins invite staff; only the owner changes roles. Exactly one active owner per space (DB-enforced).
- Anti-abuse guard: max 20 owned spaces per user (changeable; spaces remain free and otherwise unrestricted as decided).
- Non-staff see 404 for /admin and for spaces they don't belong to (existence is not revealed).
- Suspended accounts are redirected to /racun-omejen and lose all write/organizer powers via RLS (`is_active_user()`), existing records stay intact (consistent with founder decision #9).
- GDPR export/deletion: request intake + admin workflow with audit in M1; fulfilment manual until an export job is built.
- Cloud dev project `mekko-dev` (Supabase, eu-central-1) created on founder approval. Vercel previews pending until the dev DB is migrated and auth email is configured.

## 2026-11-14 — Login with e-mail + password (founder request)
- Founder asked for no e-mail codes ("kot mora biti"). Login/registration now use e-mail + password (min 8 chars) via Supabase; the 6-digit e-mail code flow is removed.
- E-mail confirmation is OFF for now (requires founder toggle in Supabase: Authentication → Providers → Email → "Confirm email" off). Trade-off accepted: addresses are not verified until an e-mail provider (Resend + mekko.eu DNS) is set up; then confirmation and "forgot password" will be added.
- Production (https://mekko-movella.vercel.app) now runs the real app on the dev database `mekko-dev`, public, noindex. A separate production database is required before a real public launch.

## 2026-11-14 — M2 (founder: "naj gre zares", with test data)
- App opens on Odkrivanje; prototype archived at /prototip (unlinked, noindex).
- Free bookings only; organizer can message attendees and cancel events; in-app notifications instead of e-mail until Resend exists.
- Test content (4 spaces, 8 events) is seeded into mekko-dev and labelled "Testni dogodek/prostor" in the UI (CLAUDE.md: label demo data clearly).

## 2026-11-14 — M3a: messages, blocking, reports, organizer verification (founder: "pojdi naprej")
Built inside confirmed decisions #6 (progressive DMs) and #9 (blocking). Paid tickets / Stripe remain blocked by decision #10 (legal review first).
- 1:1 conversations only (no group chats). Header has a separate messages icon with an unread-conversation count (PRODUCT_SPEC §2).
- First contact allowed: to anyone who organizes (owner/admin/staff of a space); organizer → people who booked their events; between members of the same space; and from accounts older than **7 days** to anyone whose profile they can see. **PROVISIONAL — founder to confirm the 7-day threshold** (`public.dm_open_after()`). Replies in an existing conversation are always allowed unless blocked or suspended.
- "Piši organizatorju" goes to the space owner. Test (demo) spaces cannot be messaged.
- Rate limits: 30 messages / 10 min, 10 new conversations / 24 h, 20 reports / 24 h per account.
- Blocking stops messages in both directions; the blocked person is not told who blocked them; bookings stay valid.
- Reports on people, messages, events and spaces go to a moderator queue (/admin/prijave). Moderators can read a private message only after it has been reported. Removing a message deletes its text (the original is kept only in the audit log as evidence). All moderation is audited.
- Organizer verification: the owner requests it, an admin (not a moderator) approves or rejects with a mandatory note; the owner gets a notification. Verified spaces show a badge.
- Not in M3a: e-mail notifications for new messages (needs Resend), real-time updates (page refresh only), attachments, support ticket intake (next slice).

## 2026-11-16 — M3b: events with manual payment to the organizer (founder: "gremo naprej")
Built inside confirmed decisions #4 (manual payment, organizer confirms, no commission) and #10 (no online sales before legal review).
- Organizer chooses "Brezplačno" or "Plačilo organizatorju" with a price per person (0,50–1000 €) and payment instructions (e.g. IBAN or cash on site). Only for registration through Mekko, not for external links.
- Guests see the price; payment instructions are visible to signed-in users only.
- A booking reserves the seat immediately (counts toward capacity) and is shown as "Čaka plačilo". The amount (price × people) is snapshotted at booking time.
- The organizer (staff or higher) either confirms receipt ("Potrdi prejem plačila") or releases the seat with a reason the visitor sees. Mekko never marks anything as paid on its own; the visitor sees "Organizator je potrdil prejem plačila".
- Price and payment instructions are locked once the event is published.
- Organizer overview shows the total of payments they confirmed and the total still awaited, labelled as manual payments (real data only, no processing by Mekko).
- **Open for founder / legal:** no automatic deadline that releases unpaid seats (organizer releases manually); invoices, VAT and refunds are the organizer's responsibility and are stated as such in the UI.
- Bug fixed on the way: the event form lost session dates and radio/checkbox choices after a failed submit (a paid event could silently be saved as free). Choices are now submitted from component state.

## 2026-11-16 — Payment deadline option (founder: "ročno zaenkrat, a naj ima možnost tudi avtomatično")
- Default stays manual release. Organizer may optionally choose a payment deadline: 1, 2, 3 or 7 days after booking (never later than the start of the booked session). Overdue unpaid reservations are released automatically (pg_cron every 10 min, and immediately when someone else tries to book that event); the visitor is notified.
- The deadline is shown on the event page, in the booking confirmation and in the organizer's attendee list, and is locked after publishing together with price and instructions.

## 2026-11-16 — Organizer legal status (marketplace information duty)
Founder asked to check whether "the organizer handles invoices, VAT and refunds" is enough. Research summary (not legal advice; lawyer review still required before a real launch, decision #10):
- 14-day withdrawal right likely does not apply to dated leisure workshops (Directive 2011/83/EU art. 16(l); CJEU C-96/21). Organizer cancellation policies remain.
- Mekko never holds money → no payment-services licence needed for manual payments.
- Missing until now: as an online marketplace (ZVPot-1 / Omnibus 2019/2161) Mekko must show whether the provider is a trader and, if not, that consumer rights do not apply; trader identity + contact should be available (also DSA trader traceability — small-platform exemption unclear).
Built:
- Space setting "Pravni status organizatorja": Podjetje · s.p. · Društvo/zavod · **ODD (osebno dopolnilno delo)** (founder addition) · Zasebnik. Non-private forms require name, address and customer e-mail; company/s.p. also a registration number.
- Status is public; provider details are shown to signed-in users (booking requires sign-in). Private organizers show a notice that consumer rights do not apply and that Mekko is not a party to the agreement. **Wording pending lawyer review.**
- Paid (manual-payment) events cannot be published without a legal status; free events show "status ni naveden" until filled.
- Still missing before real launch: Terms of use + privacy policy pages (to draft), lawyer review of the notices.

## 2026-11-16 — Zavod + organizer responsibility (founder request)
- "Zavod" is its own legal form (separate from "Društvo").
- Organizer-facing notice (space legal settings + paid-event form): Mekko is only the platform; having a registered activity where required, invoicing, fiscal cash rules (FURS), taxes/VAT and refunds are the organizer's responsibility, not Mekko's.
- Saving the legal status requires ticking an acknowledgement; time and person are stored (`spaces.legal_ack_at/by`). Wording pending lawyer review; the same principle goes into the Terms of use draft.

## 2026-11-16 — Odkrivanje: Dogodki | Ideje, new categories, quick filters (founder choice "Kombinacija")
- Odkrivanje has two tabs, Dogodki and Ideje, with the same search, categories and quick filters (ideas tab shows "Ideje prihajajo kmalu" until ideas exist).
- Categories (shared by events and ideas): Umetnost in risanje · Keramika in kiparstvo · Ročna dela in tekstil · Dom, deko in rastline · Kulinarika · Gibanje in dobro počutje · Glasba in ples · Foto in digitalno · Pisanje in jezik. Old narrower categories were merged; existing events and user interests were remapped.
- Quick filters: Za začetnike · Online · Za otroke · Ta vikend (Saturday–Sunday, Ljubljana time). "Za začetnike" and "Za otroke" are event attributes set by the organizer (two checkboxes); "Otroci in družina" is no longer a category.

## 2026-11-16 — Ideas, first slice (founder: "nadaljuj")
- Anyone signed in can publish a free idea: title, short description, category (same 9 as events), step-by-step instructions, materials, time needed, optional https link, "Za začetnike" / "Za otroke" and a card colour. Published immediately (no pre-moderation, decision: risk-based moderation).
- Guests see the preview (title, summary, author, time); instructions, materials and link need sign-in — same rule as event details.
- Authors can delete their ideas; users can save ideas (Moj Mekko → Shranjeno). Ideas can be reported; moderators can hide an idea with a reason (audited, author notified, author still sees it marked "Skrita").
- Not yet: photos and PDF attachments (need Storage with type/size validation), editing, comments/likes/reviews, paid ideas (after legal review).

## 2026-11-16 — Five visitor tabs (founder change)
- Founder: four tabs looked too sparse; Sporočila becomes the 4th tab: Odkrivanje · Moje aktivnosti · Ustvari · Sporočila · Moj Mekko. This replaces the earlier confirmed "exactly four tabs" and "TWO header icons" items (PRODUCT_SPEC §2/§7 and CLAUDE.md updated).
- To avoid duplicated navigation the header messages icon is removed; the header keeps only the notifications bell. The unread-conversation count is shown on the Sporočila tab.

## 2026-11-17 — Photos for events and ideas
- One optional photo per event and per idea. Stored in the public Supabase Storage bucket `covers` (event/idea images are public content, not paid assets). Bucket enforces JPEG/PNG/WebP and max 5 MB; the server action also checks the file signature (a renamed text file is rejected). Users can upload only into their own folder (`<user id>/…`, RLS on storage.objects).
- Phones send large photos, so the browser downscales to max 1600 px (JPEG 85 %) before upload. Photos replace the colour shapes on cards and detail pages; without a photo the colour placeholder stays. Alt text: "Fotografija dogodka/ideje <naslov>".
- Not yet: changing/removing a photo after publishing (no edit forms yet), multiple photos/gallery, PDF attachments for ideas, automatic removal of orphaned files. A moderated (hidden) idea's photo URL stays reachable if someone already has the link.
- Local dev now starts Supabase Storage (`pnpm db:start` no longer excludes storage-api).

## 2026-11-17 — Editing after publishing
- Authors edit their ideas (all fields, replace/remove photo). Only the author; others get 404 on the editor.
- Space admins edit published events: title, descriptions, category, city/address or online link, external link, capacity, max per booking, materials, audience flags, photo, card colour.
- Not editable after publishing (people booked under them): sessions/dates, price and payment terms, registration mode, cancellation policy, online/offline. Changing dates will be its own slice (needs attendee notification and possibly rebooking).
- Capacity can never be set below the seats already booked on any session (DB trigger `guard_event_capacity`).
- A changed address/city or online link automatically notifies everyone who booked.
- Replaced photos are removed from storage when they are in the editor's own folder.

## 2026-11-17 — Founder request: "Ustvarjalni feed" (mini Instagram) — PROPOSED, awaiting answers
- Founder wants a simplified Instagram-style feed for one's own creations: post, like, comment, share with friends, message them; the feed should take the current Sporočila tab position.
- This changes two confirmed items (PRODUCT_SPEC §2 "not a general infinite social network"; "no follower system yet"). Added to MVP_ROADMAP as M4b with open questions; nothing built until the founder answers them.

## 2026-11-17 — Ustvarjalni feed: founder answers (CONFIRMED, replaces the "PROPOSED" entry above)
1. Connections: **follow like Instagram** — follow anyone without approval; private profiles (visibility "private") must approve followers.
2. Visibility: **posts visible to all signed-in users by default**; per post the author may choose "samo sledilci". Guests see no feed.
3. **No recognisable children** in photos — only creations and adults. Posting requires confirming this; moderators hide violating posts.
4. Feed posts **do not count** toward the free posting quota; anti-spam limits instead (20 posts/day, 60 comments/hour).
Consequences: PRODUCT_SPEC §2 "not a general infinite social network" and "no follower system yet" are superseded for the feed. The bottom tab Sporočila becomes the feed tab; messages move back to an icon in the header (next to notifications).

## 2026-11-17 — Ustvarjalni feed built (first slice)
- Bottom tab **Feed** (Sledim | Navdih); messages are again a header icon next to notifications.
- Post = 1–5 photos (browser-resized, signature-checked) + optional caption, visibility "vsi prijavljeni" or "samo sledilci", optional link to an idea/event ("Si naredil/-a po tej ideji? Pokaži v feedu"). Posting requires confirming there are no recognisable children.
- Follow like Instagram; private profiles approve requests (Moj Mekko → Prošnje za sledenje). Blocking hides posts both ways and ends follows.
- Likes, comments (author, post author or moderator can remove), share a post to someone you follow via private message (normal messaging rules apply).
- Profile page /u/<handle> with counts and photo grid. Reports cover posts and comments; moderators hide posts / remove comments (audited, author notified).
- Limits: 20 posts/day, 60 comments/hour, 200 new follows/day.
- Known limitations: no notifications yet for likes/comments/new followers; feed shows the latest 20 (no infinite scroll yet); no hashtags/search in the feed; photos of followers-only posts are stored in the public bucket under unguessable names (not linked anywhere public) — move to signed URLs if stricter privacy is needed; no test posts in the seed (needs real photos).

## 2026-11-18 — Terms of use + privacy policy (DRAFT for lawyer review)
- Pages /pogoji and /zasebnost (Slovene), visibly marked "Osnutek v pregledu pri pravniku", version `TERMS_VERSION` in src/lib/legal.ts.
- Content reflects what is built: Mekko as intermediary (not a party to organizer–visitor contracts), manual payments not processed by Mekko, organizer responsibility (registration, invoices, fiscal cash, taxes/VAT, refunds), content rules incl. no recognisable children, moderation + appeal by e-mail, processors (Supabase EU, Vercel, Resend later), retention, essential cookies only (so no cookie banner), GDPR rights + Informacijski pooblaščenec.
- New users accept during onboarding; existing users are sent to /pogoji-potrditev until they accept the current version. Stored as profiles.terms_version / terms_accepted_at.
- **Open (founder):** operator legal name, address and registration number (placeholders in src/lib/legal.ts); minimum age (draft: 15, Slovenian age of digital consent — to confirm); retention periods (draft: account data until deletion, 30 days after deletion, moderation logs 2 years); support e-mail podpora@mekko.eu must exist.
- Bug fixed on the way: the onboarding form forgot the location/marketing/interest choices after a failed submit.

## 2026-11-18 — Feed: notifications, people search, older posts (founder: skip e-mails for now, build features)
- In-app notifications: new like (at most one per person+post per day, never for own posts), new comment, new follower, follow request, accepted request. No e-mail/push yet.
- People search (/feed/iskanje) by name or handle, min. 2 characters; blocked pairs never appear; private profiles appear (following needs approval). Returns only name + handle.
- Feed shows 20 posts per page with "Naloži starejše objave".
- E-mails (Resend + mekko.eu DNS) postponed by founder; password reset therefore still missing.

## 2026-11-18 — Ideas: likes, comments/questions, star ratings
- Signed-in users like an idea, rate it 1–5 stars (one rating per person, changeable; not one's own idea) and comment/ask questions. The author's replies are marked "avtor".
- Guests see only the like/comment counts and the average rating (no identities, no comment text). Cards show ★ average (count) and ♥ count.
- The author gets an in-app notification for a like (deduped per day), a first rating and every comment. Blocks prevent interaction. Comments: 60/hour shared with feed comments; removable by the commenter, the idea author and moderators (audited); reportable ("idea_comment" in the moderation queue).
- Not yet: written reviews separate from comments, "made it" photos linked from the idea page (use the feed post link), sorting ideas by rating.

## 2026-11-18 — Sessions, waitlist, communities, reminders (founder: "nardi use 4 in pol objavi")
- **Session changes (organizer → Dogodek → Termini):** move a future session, cancel one session (reason required) or add a session. Default confirmed by founder ("use"): when a session moves, **bookings stay valid**; bookers get a notification with the new time and may cancel themselves on the event page. Cancelling a session cancels its bookings and notifies them.
- **Waitlist:** when a session (or whole course) is full, signed-in visitors join a waitlist (1–max persons). When a spot frees up (cancellation or larger capacity) the oldest 5 waiting people get a notification "Sprostilo se je mesto"; they must book themselves (**no automatic booking**, first come first served). Re-notified at most every 12 h. Booking removes the person from the waitlist.
- **Communities / membership:** spaces choose Brez članstva / Odprto / S potrditvijo (Organizator → Člani). Visitors join on the space page; requests notify the owner, admins accept/decline/remove. Public shows only the member count; the member list is visible only to the space team.
- **Members-only events:** an event can be "Samo za člane prostora" (only when membership is on). RLS hides it from non-members everywhere (discovery, space page, direct link) and booking is refused for non-members.
- **Announcements:** space team posts "Obvestila za člane" (max 20/day); members get an in-app notification and see them on the space page.
- **Reminders:** an in-app reminder "Jutri: …" about 24 h before each booked session (pg_cron every 15 min, sent once per booking+session). E-mail reminders come with Resend later.
- Not yet: e-mail/push for these, member-only chat/forum, waitlist position number, automatic booking from the waitlist, recurring-series editing in bulk.

## 2026-11-19 — Studio tools (M5 part 2, no new business decisions)
- **Koledar** (Organizator → Koledar): all sessions of the space by month, with bookings/capacity, cancelled sessions struck through, link to attendance.
- **Prisotnost:** the space team (staff and up) marks each booking present/absent per session, from 12 h before the start. Stored in `attendance`; visible only to the team (attendees do not see it). Whole-course bookings are marked per session.
- **Izvoz CSV:** attendee list per event (session, name, handle, persons, note, payment state, amount, attendance) for the team only; `;` separator + BOM for Slovene Excel; cells that could run as formulas are neutralised. Contains personal data — organizers are controllers for what they download (to mention in the organizer terms).
- **Plačila:** overview of manual payments from real bookings only (confirmed total and this month, awaiting, overdue, per event). Mekko does not process money; no fabricated figures.
- Not yet: passes/cards (needs pricing decisions), recorded courses (needs paid-content decision), staff-specific permissions beyond staff/admin/owner, export of all events at once.

## 2026-11-20 — Whole-app phone review
- New regression test `e2e/phone/all-pages.spec.ts`: one account visits every real page (visitor, organizer, admin, guest — 52 pages) at 320/375/390/430 px and desktop, checking horizontal overflow and serious/critical WCAG issues; `AUDIT_SHOTS=<dir>` saves screenshots for visual review.
- Result: no overflow and no serious a11y issues. Visual fixes: Feed header was cramped at 320 px (search is an icon on phones), attendee count now reads "2 osebi od 3 mest", calendar dates no longer capitalise month names.

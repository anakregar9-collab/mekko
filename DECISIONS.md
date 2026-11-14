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

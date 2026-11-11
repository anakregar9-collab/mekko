# M0 review — state, contradictions and decisions for the founder

Status: **reviewed 2026-11-11.** The founder accepted all recommended defaults (items 1, 2, 3, 4, 6, 7, 9, 10), approved the Supabase dev project, Vercel previews, email-first auth and Resend (domain `mekko.eu`). Confirmed text: `DECISIONS.md`.

## 1. Repository and environment state (2026-11-11)

| Item | State |
|---|---|
| Repo | `anakregar9-collab/mekko`, private. `main` = product docs only. M0 work is on branch `m0-foundation`. |
| App | Next.js 16.4 (App Router, Cache Components, Partial Prefetching), React 19.3, TypeScript 5.9, Tailwind 4.3, pnpm 10.28, Node ≥ 22 |
| Tests | Vitest 5 (unit), Playwright 1.63 + axe-core (E2E, 4 phone widths + desktop) |
| CI | `.github/workflows/ci.yml`: typecheck → lint → unit → build → E2E |
| Env files | Only `.env.example` (variable **names**, no values). No `.env*` with secrets exists or is committed. |
| Supabase | **Not linked.** A Supabase connector is available in this session, but I did not create or link any project (needs your approval: project name, EU region, org). |
| Vercel | **Not linked.** Connector available; no project or preview deployment created (needs approval). |
| Stripe | No credentials. Not needed before M3. |
| Google OAuth | No client ID/secret. Needed in M1. |
| Email provider | Not chosen (open decision #6). Needed for M2 confirmations; Supabase Auth's built-in mailer is fine for M1 dev only. |
| Map / geo provider | Not chosen (open decision #6). The prototype shows a labelled placeholder. |
| shadcn/ui | Registry (`ui.shadcn.com`) is blocked from this environment, so M0 uses small hand-written primitives in `src/components/ui` using the same conventions (Tailwind classes, `cn()`). shadcn can still be adopted in M1 from a local machine. Recommendation: adopt it for form controls, dialogs and menus (Radix accessibility). |

## 2. Contradictions and dangerous gaps (max 10)

Each item lists a **default resolution** that the prototype and model already follow. Items marked **APPROVAL** need your decision. The others are engineering defaults you can still override.

1. **Login-gated details vs SEO and sharing (APPROVAL).** The spec says details require login, but also asks for "sufficient public, crawlable previews". If everything is gated, shared links and Google results show nothing useful.
   *Default:* public, indexable preview pages (title, cover, date/time, city, organizer, price range, category, availability). Login is required for the exact address, online link, full description, materials, organizer contact and booking. The prototype event page has a "Gost / Prijavljen" toggle that shows this split.

2. **Free posting quota scope (APPROVAL).** The spec doesn't say whether the quota counts events, ideas or community posts, or whether it applies per person or per space.
   *Default:* `posting_quotas` is admin-configured per period and per account **and** per space. It counts published events and published ideas. Community posts and drafts are not counted. The initial value is unlimited, because acquisition comes first. Existing listings are never retroactively charged or unpublished.

3. **External registration bypasses commission and the booking data (APPROVAL).** External listings produce no participant list and nothing in Moje aktivnosti, and they avoid commission.
   *Default:* allow external listings, clearly marked "Zunanja prijava" with a leaving-Mekko notice. They count toward the posting quota. Users can save them but can't book them. There are no hidden ranking penalties. Track outbound clicks for attribution. Any future limits must be published openly.

4. **Manual / off-platform payment semantics (APPROVAL).** It's unclear who marks a booking "paid", whether commission applies, and what the user sees.
   *Default:* the booking status is `pending_payment` and the organizer marks it `confirmed`. Mekko never shows "plačano" for off-platform money. No commission on manual payments in MVP. The capacity hold lasts until the organizer confirms or cancels.

5. **Who owns events: the person or a space? (engineering default).** The spec has "personal account + organizer mode" and also "spaces with owner + admins". Two ownership models would duplicate events.
   *Default:* events, tickets, bookings and payouts **always belong to a space**. Switching on organizer mode auto-creates a `solo_creator` space for the person. Ideas belong to a person, optionally published under a space. This keeps one canonical event model across all space kinds.

6. **Messaging from day one is a spam vector (APPROVAL).** Section 7 says all registered users can DM each other, but the roadmap puts messaging and moderation in M3.
   *Default:* ship DMs in M3 together with report, block and rate limits. A new user can first message only an organizer (from an event or space page) or someone they share a booking or membership with. They can message anyone after basic account age or verification. Organizer email contact stays available as a form, with the address never exposed.

7. **Community membership pricing UI while dues are postponed (spec §9.3, APPROVAL).**
   *Default:* show no pricing section at all, only "Pridruži se" (open) or "Zaprosi za članstvo" (approval). The `membership_plans` table is deferred to M6 so no misleading paid UI can exist.

8. **Private events vs "no manual approval flow" (engineering default).** Private events need access control, but general organizer approval is out of scope.
   *Default:* `visibility = private` means access only by an unguessable invite link (rotatable). `members_only` means only active members of the space. Neither is listed in discovery or search. There is no approval queue.

9. **Blocked or suspended users with existing bookings (APPROVAL).**
   *Default:* the booking stays valid. Blocking disables messaging and comments between the pair only. If an organizer removes an attendee for safety, the booking is cancelled under the "organizer cancelled" path, which means a full refund regardless of policy. Suspended accounts can't create new bookings. Existing bookings get an admin review flag.

10. **Payments, KYC and tax are entangled with "anyone can sell ideas" (APPROVAL, blocks M3/M4).** Any registered user may sell paid PDFs, but payouts need seller onboarding, KYC, invoicing and VAT/consumer-rights handling, which are unresolved.
    *Default:* paid content and paid tickets are hidden behind a per-space `seller_accounts.status = verified` gate **and** a platform feature flag. Until legal review, only free events/ideas and manual-payment events can be published. The spec's PWA-first recommendation (open #9) is also assumed: responsive web/PWA, no native app.

Also noted: branding, palette and fonts in the prototype are **first-pass placeholders** (spec §9.8). The `Bricolage Grotesque` / `Figtree` fonts and the coral/cream palette need your approval.

## 3. What I needed from you (answered 2026-11-11, see DECISIONS.md)

1. Approve or change the defaults for items **1, 2, 3, 4, 6, 7, 9, 10** above.
2. Give feedback on the clickable prototype (look and feel, density, tone of copy, the four tabs).
3. Approve the M1 infrastructure: create a **Supabase dev project** (EU region, e.g. Frankfurt) and a **Vercel project** with preview deployments only, connected to this repo. No production.
4. Provide a **Google OAuth** client (or approve email-only login for the first M1 slice).
5. Optionally say which email provider you prefer (e.g. Resend, Postmark, Brevo).

## 4. How to view the prototype locally

```bash
git clone https://github.com/anakregar9-collab/mekko && cd mekko
git checkout m0-foundation
corepack enable && pnpm install
pnpm dev   # open http://localhost:3000 (review hub) — try a phone-width window
```

Every screen is under `/prototip/*`, shows the black "PROTOTIP · demo podatki" bar and is `noindex`.

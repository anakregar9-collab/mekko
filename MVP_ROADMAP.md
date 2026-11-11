# MEKKO — MVP delivery roadmap
Status: proposed sequencing, not a commitment to implement every feature before first public release.

## Exit criteria common to every milestone
- Feature acceptance checklist checked as real browser tests, including phone and desktop.
- Typecheck + lint + tests pass; CI has no critical failures. RLS/authorization tests for each new table/endpoint.
- No unresolved blocker-level bugs, unexpected data exposure or dead buttons; documentation and migrations current.
- Screenshots or preview showing key states: empty/loading/error/success/permission denied.

### M0 — Project foundation + visual prototypes
- Create fresh repo, choose package manager, Next.js TS + Tailwind + component system, Supabase local/dev, GitHub CI, staging Vercel preview.
- Document data/entities/roles and permission matrix, routing, UI style tokens, 4-tab mobile navigation, three workspaces, core 10-15 wireframes. Confirm design before broad implementation.
- Authentication architecture, env management, seed strategies, no live production data.
Exit: founder can review a clickable responsive prototype and a tested schema/security design.

### M1 — Authentication + first publisher
- Email + Google login; onboarding with interests and approximate location; personal profile privacy.
- Organizer mode; create solo creator/community/studio/association with shared space model; owner and admin permissions. Free multiple spaces at first.
- Basic admin view / role bootstrapping, RLS, account deletion/export request entry point.
Exit: guest/user/owner/admin journeys verified; no cross-space edit possible.

### M2 — Discover + free event bookings (first valuable slice)
- Feed of event cards and ideas previews; search, location and categories; user saves.
- Create one-off and multi-session event with capacity; free booking, group booking; organizer participant list; user's My Activities + calendar; change/cancellation notices.
- External registration link labeled as external. Basic waitlist and recurring event may be next iteration if they delay validation, but underlying models should support them.
Exit: new organizer publishes event and participant books end-to-end on phone and desktop with email confirmation.

### M3 — Monetized event checkout + ops (public paid launch gate)
- Choose fee config + contracts after competitor/cost/legal check; complete Stripe Connect feasibility and seller onboarding.
- Native paid tickets, price variants, booking capacity reserved safely during checkout, verified webhook, refund policy template, refunds, purchases and organizer payouts/ledger; admin financial view.
- Messaging/event notices and minimum moderation (report/block/rate limits, organizer verification); support intake.
Exit: test-mode transactions pass success/failure/retry/refund/dispute/multi-ticket tests; business/legal/ops checklist signed off; production only on explicit approval.

### M4 — Creative ideas + community basics
- Idea post photo/description + secure PDF + external link, free or one-time paid where legal/processor ready; saves/library.
- Comments/questions, likes, reviews and user-created photos can ship in increments.
- Community open/approval membership, member-only posts, events and shared schedules; paid member dues later.
Exit: purchase grants exactly the correct content access; private membership rules tested.

### M5 — Recorded courses + studio improvements
- Single video and multi-lesson course, PDF attachments, lesson completion; creator/space library.
- Studio calendar and attendance management, financial reports, staff roles; passes/cards after core booking behavior stable.
Exit: video assets secured, progress persistent, accounts with different permissions cannot access others' paid course content.

### M6 — Growth + advanced commerce
- Configurable quotas/promoted listings/premium packages and experimentation, improved discovery, vouchers, paid community dues, physical shop with fulfillment/refunds (future).
- Dark theme, broader localization, more automated messages, recommendation ranking and analytics.
Exit: each new feature has measurable success and support cost assessment.

## Operational launch gates
- Legal/privacy/cookie/terms and refund information; GDPR operations; seller agreement and consumer compliance reviewed appropriately.
- Full security review including RLS/storage/payment; rate limits; abuse moderation and incident runbook.
- Accessibility and mobile regression, transactional emails, backups, logs/alerts, payment reconciliation and support route.
- Non-production domains before explicit launch. Do not launch if payment/compliance incomplete; free-booking pilot is an option with clear scope.

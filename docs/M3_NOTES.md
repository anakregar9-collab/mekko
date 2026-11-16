# M3a — Messages, blocking, reports, organizer verification

Migration: `supabase/migrations/20261114153517_m3_messaging_moderation.sql`
DB tests: `supabase/tests/messaging.test.sql` (44 tests). E2E: `e2e/m3/messaging.spec.ts`.

## Data
| Table | Purpose | Who can read | Writes |
|---|---|---|---|
| conversations | 1:1 pair (user_a < user_b), last message, read markers | the two participants | RPC only |
| messages | text ≤ 2000 chars; `removed_at` after moderation | participants; moderators only if reported | RPC only |
| user_blocks | blocker → blocked | the blocker | `block_user` / `unblock_user` |
| reports | profile / message / event / space, reason, details | reporter (own), moderators | `report_content`, `admin_resolve_report` |

## RPCs
`start_conversation`, `contact_space` (→ space owner), `send_message`, `mark_conversation_read`, `unread_conversations`, `can_message`, `block_user`, `unblock_user`, `report_content`, `admin_resolve_report` (moderator+), `admin_remove_message` (moderator+), `request_space_verification` (owner), `admin_set_space_verification` (admin+).

## Routes
- `/sporocila` inbox, `/sporocila/[id]` conversation (reply, block, report message/person), `/sporocila/nov?komu=<id>` (organizer → attendee)
- `/moj-mekko/blokirani` blocked people
- Event and space pages: "Piši organizatorju" + report
- Organizer attendee list: "Piši" link; overview shows real counts + verification request
- `/admin/prijave` moderation queue; `/admin/prostori` verification approvals

## Known limitations
- No real-time updates or e-mail alerts for new messages (refresh the page). E-mail comes with Resend.
- 7-day threshold for messaging anyone is provisional.
- Removing events/spaces from moderation: moderators currently suspend the account (/admin/uporabniki); a direct "hide event" tool is a follow-up.

# M3b — Manual payment events

Migration: `supabase/migrations/20261116083609_m3b_manual_payments.sql`; DB tests: `supabase/tests/payments.test.sql` (20); E2E: `e2e/m3/payments.spec.ts`.

- `events.payment_mode` ('free' | 'manual'), `price_cents`, `payment_instructions` (constraint: manual ⇒ price + instructions + native registration). Terms locked after publish (`lock_payment_terms` trigger).
- `bookings.payment_state` ('none' | 'awaiting' | 'organizer_confirmed'), `amount_cents`, `payment_confirmed_at/by`; set by the `bookings_payment_snapshot` trigger, never by clients.
- RPCs: `confirm_booking_payment(booking)`, `release_unpaid_booking(booking, reason)` — staff+ of the event's space; both notify the booker.
- UI: price on cards and event page, "Plačilo" section with instructions, "Čaka plačilo" in Moje aktivnosti, organizer attendee actions, overview totals.
- Test content: "Tkanje na statvah" (25 €, instructions say TESTNI PODATKI – ne nakazuj denarja).

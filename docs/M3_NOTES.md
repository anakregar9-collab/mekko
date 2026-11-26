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

# M3c — Optional payment deadline
Migration `20261116085406_m3c_payment_deadline.sql`, tests `supabase/tests/payment_deadline.test.sql` (9).
`events.payment_deadline_hours` (null | 24 | 48 | 72 | 168), `bookings.payment_due_at` (snapshot), internal `release_overdue_reservations(event?)` called from `book_event` and pg_cron job `mekko-release-overdue-reservations` (*/10). Needs the `pg_cron` extension (enabled by the migration).

# M3d — Organizer legal status
Migration `20261116091616_m3d_organizer_legal_info.sql`, tests `supabase/tests/legal_info.test.sql` (11).
`spaces.legal_form` (public) + `space_legal_info` (signed-in read, RPC write `set_space_legal_info`, admin+). `publish_event` refuses paid events without legal form (`legal_info_required`). UI: settings form, `ProviderInfo` box on event and space pages, overview next step, admin spaces badge. Demo spaces carry clearly marked TEST details.

# M3e — Zavod + organizer responsibility
Migration `20261116101522_m3e_institute_responsibility.sql` (written without DROP statements: the hosted migration tool's confirmation prompt never reached the founder). `spaces.legal_form` was recreated with the wider check (`institute` added); the previous column is kept as `legal_form_v1` (obsolete, cleanup later). The old 6-argument `set_space_legal_info` is a refusing stub; the 7-argument version requires `p_ack = true` and stores `legal_ack_at/by`.

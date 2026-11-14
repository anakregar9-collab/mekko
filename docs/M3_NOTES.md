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

# M2: events and free bookings

Status: implemented on branch `m2-events` (stacked on `m1-auth-spaces`), verified locally.

## What's built

- **Real app home:** `/` redirects to `/odkrivanje`. The M0 prototype review hub moved to `/prototip` and is no longer linked from the app.
- **Odkrivanje:** upcoming published events, soonest first, with search (`?q=`) and category chips (`?kategorija=`). Personalization does not filter search.
- **Event page** `/dogodki/[slug]`:
  - guests see a preview without the address, description, materials or online link (enforced by column grants);
  - signed-in users see everything and can book for free (1–N people, an optional note to the organizer), cancel, save, add to Google Calendar and open the map;
  - the online link is visible only to confirmed attendees.
- **Space page** `/prostori/[slug]`: info and upcoming events.
- **Moje aktivnosti:** real bookings in a list and calendar. A multi-session booking expands to all sessions.
- **Obvestila:** in-app notifications (booking confirmed, organizer announcement, event cancelled). The header bell shows the live unread count.
- **Moj Mekko → Shranjeno:** saved events.
- **Organizer** `/organizator/[space]/dogodki`:
  - create an event as one-off sessions or a multi-session course, native or external registration, online or in person, with capacity, max people per booking and a cancellation policy;
  - publish it or keep it as a draft;
  - attendee list per session, announcement to all attendees, cancel the event with a reason (all bookings are cancelled and attendees notified), delete a draft.

## Security

- Capacity is enforced in `book_event()` under a row lock, so overselling is impossible. Bookings can't be inserted directly.
- The event status changes only through `publish_event` and `cancel_event`.
- Attendee lists are visible only to the space team. Organizers can see attendee names even when the attendee's profile is private.
- pgTAP: 30 new tests (`supabase/tests/events.test.sql`).

## Test content

`supabase/seed.sql` adds 4 test spaces and 8 test events (`is_demo = true`, shown with a "Testni dogodek" / "Testni prostor" badge). Dates are relative to the seeding day. Demo organizer accounts cannot sign in.

## Not in M2 (by decision)

- Paid tickets and manual payments (after legal review).
- E-mail confirmations (need Resend), so in-app only.
- Map provider (not chosen), so a link to Google Maps is used instead.
- Waitlist UI and recurring events (the data model supports them).
- Editing sessions after creation.

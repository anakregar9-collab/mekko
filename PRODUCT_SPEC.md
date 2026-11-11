# MEKKO — MASTER PRODUCT SPECIFICATION
Version: planning baseline 2026-11-11. Status: confirmed decisions + explicitly marked recommendations/open questions.

## North star
Mekko is a Slovenia-first discovery platform for creative and lifestyle activities. Users discover events, workshops, creators, ideas and online courses; organizers publish events and sell access/content. Revelie is a separate product (not a dependency). UX is playful creative, warm, uncluttered and mobile-first for visitors, desktop-optimized but mobile-usable for organizers. Launch language Slovene; design for eventual localization. Light theme first, dark later.

## 1. Audiences and accounts
- Public visitors may browse previews, but details require login (decision). Ensure sufficient public, crawlable previews and transparent registration prompts; SEO/privacy implications to review.
- Registration by email and Google. One personal account can be visitor, author and/or operator of multiple spaces.
- Free personal account with optional organizer mode. No Basic/Creator/Business personas by default.
- Anyone registered can publish ideas and may offer paid material if eligible and onboarded for payouts.
- Spaces: creator business profile, community, studio, association/organization. One owner and inviteable admins/collaborators with scoped permissions. Multiple spaces initially free; caps and pricing configurable later.
- Organizer public profile: bio, images, social links, upcoming/past events and gallery. No reviews/following organizer profiles required yet (idea reviews are confirmed).
- Personal profile privacy chosen by user. Private data never shown as part of public profile.

## 2. Navigation, home, UX
- Main mobile navigation exactly four: Odkrivanje, Moje aktivnosti, Ustvari, Moj Mekko.
- Header has TWO separate icons: private messages and notifications (later instruction overrides older combined icon concept).
- Home is a dynamic social-feed-style discovery of events, ideas and relevant content, NOT a general infinite social network. Events are the core conversion action; clear filters and CTAs.
- Personalization inputs: onboarding interests, favorites/saves, approximate location. Provide controls to change interests/location, with search to browse everything. No requirement for AI recommender at launch.
- Moje aktivnosti: registrations, history, calendar. Moj Mekko: personal profile, settings, saved items, purchased library and switch into organizer workspace.
- Ustvari: centralized creation menu. Organizer mode has its own dashboard/navigation while remaining responsive on mobile.
- No duplicate menus or filters, oversized promotional banners, inconsistent components, unnecessary clicks, desktop-only functions, or placeholder links presented as working.

## 3. Events and bookings
- Types: one-off, multi-session courses, recurring, online, private.
- Multi-session course: one booking of series, all sessions shown in calendar; recurring events may permit bookings per occurrence. Share underlying event/session/booking model.
- Native Mekko registration + checkout preferred; optional external registration URL (must transparently mark offsite). Private manual/off-platform payment also supported.
- Free and paid events, multiple ticket types. Optional seat capacity, sold-out state, waitlist, registration/cancellation deadlines, reservations for multiple attendees.
- Details: location/map or online link, materials list, automated reminders, organizer notices, cancellation/reschedule updates.
- Organizer selects from standardized cancellation/refund policy templates. Never change a purchased policy retroactively. Charge/refund logic must be verified.
- User sees bookings in My Activities list and calendar.
- Non-selected scope: event-gallery and custom signup questionnaire, manual organizer approval as general registration flow (unless required for private event safety).

## 4. Ideas, courses, library, future shop
- All registered users can publish an idea: photo+description, PDF instructions or external guide URL. Free or one-time paid, subject to seller compliance. Paid files served with access controls, not public storage URLs.
- Discover by interests and saved content, with categories/search still available; favorite ideas, library of saved/purchased, questions/comments, likes, images of user's finished work, ratings/reviews.
- Recorded courses: single video or structured lessons, video + PDF materials, free/paid access, manual completed-lesson tracking.
- Distinguish idea and course content types but reuse purchase, entitlement, asset, moderation services.
- Physical shop deferred; when introduced it should support full native checkout/order/shipping instead of outbound-only links. Gift cards deferred.

## 5. Spaces and communities
- Public space page: overview/gallery, events/calendar, memberships/pricing (only relevant services), courses/ideas.
- Community: members, join/leave and open/approval-based closed membership; posts and discussions, recurring gatherings, private groups and member-only content (binary member vs non-member; no tiered paywalls at launch).
- Paid community dues postponed (earlier advanced concept superseded by section 6). No active charged dues at MVP; avoid misleading paid membership pricing UI.
- Studio extras: team admins, schedules, booking/attendee oversight, financial reporting, multi-visit passes/cards and recorded courses. Some advanced functions may be post-MVP; separate Revelie for full exercise-studio operations.
- Organizations and solo creators reuse common space model with capability flags; DO NOT make parallel implementations of events or settings per space kind.

## 6. Revenue and payments
- Hybrid model: transaction commission borne by organizer + premium tools/subscriptions. Exact % TBD pending market/fees research, not to be hard-coded.
- Free event/idea posts up to admin-defined quota (TBD). Distinguish public free posts from paid postings. Changes to quotas must be communicated and applied consistently; never surprise-charge existing listings.
- Early priority: many organizers and listings; later higher commissions/subscriptions/purchasable upgrades, promoted events, gift cards, digital sales commission, business tools.
- Support native payments and explicitly off-platform/manual payment cases. Stripe Connect is the proposed payment processor, contingent on feasibility, supported Slovenian account structures and proper legal review.
- Ledger/order/payment/entitlement separate; idempotent webhooks; distinguish gross transaction amount, platform fee, processor fee, refunds, taxes, organizer net. Cannot mark payment as settled merely upon a redirect. Refunds/disputes and payouts must be audited and reconciled.
- Seller onboarding, verification and compliance; no claim that every registered person can receive payouts without checks. No live checkout until compliance and tests complete.

## 7. Communication, privacy and safety
- In-app user-to-user messages for all registered users; contact form/email to organizer too.
- TWO separate notification and message icons.
- Notifications: booking/payment confirmation; event reminders; changes/cancellations; messages/comment replies; organizer announcements to members. Only essential service communications by default; marketing requires opt-in.
- Reporting, blocking, basic anti-spam/rate limits, platform moderator queue, organizer verification. Privacy of profiles configurable; phone/email, purchase history and personal data never made public by default.
- Define edge cases: blocked users with existing bookings; admin escalation; records retention; secure uploads; content ownership/copyright reporting; GDPR rights including deletion/export.

## 8. Admin
- Dashboard: users/organizers, event/reservation/sales volume, gross/revenue/commissions, exceptions/alerts.
- Users: browse/search, suspensions/deletion controls, space/organizer records, special grants, GDPR deletion requests.
- Moderation: selective/risk-based new organizers and flagged content; not all posts reviewed by default.
- Admin-managed configurations: fee pricing, quotas, categories/interests, promotional codes, feature flags; editorial discovery boosts blended with personalized feed.
- Financial: transactions, refunds/disputes, revenue by organizer, exports, fraud warnings. Customer support email + ticket queue.
- Founder admin initially, later scoped additional admins. Audit all sensitive admin actions; do not expose financial/private fields to ordinary users.

## 9. Open decisions — DO NOT silently assume these are confirmed
1. Exact commission, processor fee allocation, subscriptions, free post limits and whether affiliate/off-platform sales affect monetization.
2. MVP selection from broad confirmed vision: especially recorded courses, pass/card system, messages, comments, waitlists and refunds.
3. Community membership pricing on public page even though dues postponed: display free membership or remove pricing until activated.
4. User identity / legal status of creators who sell paid products (KYC, invoicing, tax treatment and refund/consumer-rights workflows).
5. External registration may bypass Mekko commission; define incentives/limits and attribution instead of hidden restrictions.
6. Geo-discovery data source, map API and location privacy consent; email/push provider.
7. Scope and capacity of third-party course video hosting; avoid storing public paid video links.
8. Exact branding: logo, palette, fonts and finalized wireframes not yet approved.
9. Web-only PWA at launch vs eventual native app: recommendation is responsive PWA first, NOT confirmed by founder.

## 10. Acceptance principles
- Each journey must work at mobile width 320/375/390/430px and common desktop widths; accessibility, keyboard/focus states, touch targets, readable text.
- Each module has testable user stories across guest, user, organizer owner, organizer admin, platform admin, blocked/suspended account.
- No actual deployment, destructive data operation, production migrations or payment-live toggles without explicit owner approval.
- This file is the product truth. Update it when the founder approves a change, logging old/new decision in DECISIONS.md.

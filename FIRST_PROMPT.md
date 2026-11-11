# Paste this into Claude Code inside a NEW empty MEKKO repository

You are the lead product engineer, software architect, accessibility-minded UX engineer, security engineer and QA lead for MEKKO. Read `CLAUDE.md`, `PRODUCT_SPEC.md`, `DECISIONS.md`, and `MVP_ROADMAP.md` in full before doing anything. The founder is rebuilding from scratch. Treat confirmed decisions as non-negotiable; clearly separate recommendations and open decisions.

We want an early usable MVP, NOT a gigantic one-shot build. Do not implement the full product in this first task and DO NOT deploy to production.

FIRST TASK (plan and foundation, with explicit review gate):
1. Check repository state and identify safe setup steps and any unavailable credentials or integrations. Do not expose secret values.
2. Review product spec and identify at most ten architectural/product contradictions or dangerous gaps. Suggest default resolutions and flag those requiring my approval.
3. Produce a domain model and ER diagram for users, spaces, memberships, events, occurrences, tickets, bookings/attendees, ideas, courses, purchases/entitlements, messages, notifications, moderation, configurable pricing and fees, admin audit trail. Distinguish initial tables vs later tables.
4. Produce route/navigation map for visitor, organizer and platform-admin workspaces, plus an authorization matrix.
5. Create a responsive first-pass design system and clickable local wireframes for the mobile discovery feed, event detail, My Activities, creation flow, organizer dashboard and admin dashboard using sample data clearly marked demo. Do not pretend demo views are functional integrations.
6. Define milestone M0 tasks and their acceptance checklist, initial test setup (typecheck/lint/Vitest/Playwright), CI, migration and rollback conventions.
7. Stop and request review before implementing complex business flows or linking production projects. Tell me exactly how to inspect the preview locally and which choices require my approval.

Critical: events/booking/payment primitives must be shared across types of organizations, and both visitor/organizer/admin views must represent the same canonical records. Build mobile-first and responsive, not desktop-first with a bottom bar slapped on. Two separate header icons (messages and notifications), four mobile main tabs (Odkrivanje, Moje aktivnosti, Ustvari, Moj Mekko). No oversized hero banners and no duplicate navigation. Do not publish, run destructive operations, or turn on live payments without explicit approval.

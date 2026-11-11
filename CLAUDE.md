# Claude Code operating rules — MEKKO
Read `PRODUCT_SPEC.md`, `MVP_ROADMAP.md`, and `DECISIONS.md` before proposing architecture changes. Product spec confirmed decisions override speculative suggestions. Never infer missing business requirements silently.

## Goal
Build a polished, maintainable Slovenia-first, creative/lifestyle event-discovery platform. Four visitor mobile tabs: Odkrivanje / Moje aktivnosti / Ustvari / Moj Mekko. Playful creative, light mode, mobile-first. Separate organizer/admin workspaces. MVP early, with testable vertical slices.

## Workflow
1. Begin by inspecting repo state, scripts, environment files NAMES (not their secret values), and docs. Summarize current state and next atomic goal.
2. For architecture/data/security changes first propose a short implementation plan, constraints, migrations and acceptance tests. Ask for approval if a decision is unconfirmed or a destructive/production impact exists.
3. Implement one coherent feature slice with minimal surface area; reuse shared models/components; do not create duplicate event, booking, profile, payment or settings systems.
4. Update tests, schemas/migrations, docs and DECISIONS.md in the same change; run typecheck, lint, unit/integration and targeted E2E before claiming done.
5. Report exactly: changed files, test commands/results, remaining TODOs, known limitations, user verification steps. Never claim tested if not run.
6. Work on development branch; open PR or produce reviewable commit. Never deploy to production, delete a project/repo/database, reset environments, run destructive SQL or activate real payments without explicit user permission.
7. Do not store secrets in source control or logs. Use local env templates and vault/platform secrets.

## Suggested stack (verify current stable docs before bootstrapping)
Next.js App Router + TypeScript + Tailwind + shadcn/ui, Supabase Postgres/Auth/Storage, Stripe Connect conditional on compliance, Vercel previews, GitHub, Playwright E2E + Vitest unit tests. Prefer one modular monolith and one Supabase schema with migrations, rather than microservices or duplicate databases.

## Security and quality
- Server-authorize every sensitive action. Use Supabase RLS; test member, organizer, owner, other organization and platform admin cross-tenant access.
- Keep service-role credentials server-only; signed access to paid assets; validate upload type/size; rate limit messaging and auth abuse.
- Robust checkout/order workflow: no payment success based on client redirect; verify signed webhooks, idempotency, refunds, access revocation and payout reconciliation.
- No mock data in live financial views. Label seeded/demo data clearly.
- Accessible, responsive design: no duplicated navigation, giant banners, horizontal overflow or hidden mobile forms.
- Personalization must not suppress ordinary search; notification marketing requires opt-in.

## Source of truth
`PRODUCT_SPEC.md`: confirmed product requirements and unresolved business choices.
`MVP_ROADMAP.md`: phases, release gates and priorities.
`DECISIONS.md`: decision log and unresolved items.
If any docs conflict, call it out and request a founder decision rather than choosing arbitrarily.

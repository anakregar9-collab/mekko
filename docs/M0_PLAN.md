# M0 — foundation plan and acceptance checklist

## M0 tasks

| # | Task | State |
|---|---|---|
| 1 | Fresh repo, pnpm, Next.js 16 + TS + Tailwind, lint, Prettier | ✅ done |
| 2 | Domain model + ER diagram (`DOMAIN_MODEL.md`) | ✅ proposed, awaiting review |
| 3 | Route map + authorization matrix (`ROUTES_AND_AUTHZ.md`) | ✅ proposed, awaiting review |
| 4 | Spec contradictions and defaults (`M0_REVIEW.md`) | ✅ proposed, awaiting review |
| 5 | Design tokens + base components (`DESIGN_SYSTEM.md`) | ✅ first pass, awaiting review |
| 6 | Clickable prototypes: feed, event detail, My Activities, Ustvari + create flow, Moj Mekko, messages, notifications, organizer and admin dashboards | ✅ done (demo data) |
| 7 | Unit tests (Vitest), E2E (Playwright + axe), CI workflow | ✅ done |
| 8 | Supabase dev project (EU) + local stack (`supabase init`, Docker) | ⏸ needs approval / credentials |
| 9 | Vercel project with preview deployments only | ⏸ needs approval |
| 10 | Auth architecture: Supabase Auth (email magic link + password, Google OAuth), `@supabase/ssr` cookies, `proxy.ts` session refresh, onboarding | ⏸ design below, built in M1 |
| 11 | Seed strategy | ⏸ design below |

## M0 exit checklist

- [x] Clickable responsive prototype for all key screens, clearly marked demo, `noindex`
- [x] Four visitor tabs, two header icons, no duplicate nav, no horizontal overflow (tested at 320/375/390/430/1280)
- [x] Serious/critical axe violations: none (tested)
- [x] No dead buttons: unimplemented actions explain themselves (`PrototypeAction`)
- [x] Typecheck, lint, unit and E2E pass locally; CI workflow committed
- [x] Domain model, permission matrix and routes documented
- [ ] Founder review of prototype, defaults in `M0_REVIEW.md` and design direction
- [ ] Supabase dev + Vercel preview linked (after approval)
- [ ] Tested schema/security design: first migration + pgTAP RLS tests (first M1 task once Supabase is approved)

## Test setup

| Command | What it does |
|---|---|
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` (typed routes / `PageProps`) |
| `pnpm lint` | ESLint (`eslint-config-next`, includes jsx-a11y) |
| `pnpm test` | Vitest unit tests (`src/**/*.test.ts`), TZ forced to UTC to catch timezone bugs |
| `pnpm build && pnpm test:e2e` | Playwright against the production build: phones 320/375/390/430 + desktop 1280, axe on every screen |
| `pnpm check` | typecheck + lint + unit |

From M1: `supabase test db` (pgTAP) for RLS, run in CI against the Supabase local stack.

## CI

`.github/workflows/ci.yml` runs on every PR and push to `main`: install (frozen lockfile) → typecheck → lint → unit → build → Playwright (Chromium). The HTML report is uploaded as an artifact. It has no secrets and no deploy steps. Vercel handles preview deployments once linked. Production deploys are never automatic and need explicit approval.

## Branching

- `main` is protected (recommendation: require the PR + CI check).
- Feature work goes on `m<N>-<slice>` branches with one PR per vertical slice.

## Migration conventions (from M1)

- Supabase CLI migrations in `supabase/migrations/<UTC timestamp>_<snake_name>.sql`, created with `supabase migration new`. Never edit a migration after it is merged. Add a new one instead.
- Each migration enables RLS on new tables in the **same file**, has policies for every role in the matrix, and has pgTAP tests in `supabase/tests/<area>.test.sql`.
- Schema changes follow **expand → migrate → contract**: add nullable columns or new tables, backfill, switch code, and drop only in a later release.
- Generated types: `supabase gen types typescript --local > src/lib/db/types.ts`, committed and checked in CI for drift.
- Destructive statements (`DROP`, `TRUNCATE`, data-deleting `UPDATE`/`DELETE`) require a note in the PR and explicit founder approval before they run on any shared environment.

## Rollback conventions

- **App:** Vercel instant rollback to the previous deployment. The DB stays backward-compatible for one release thanks to expand/contract.
- **DB:** forward-fix by default (a new migration that reverses the change). For risky migrations, the PR includes a tested `-- rollback:` SQL block and a pre-migration backup or branch (Supabase branching / PITR on paid plans).
- **Payments:** feature flag `payments_enabled` off = immediate kill switch for checkout. Webhook processing stays on so in-flight payments still reconcile.

## Seed strategy

- `supabase/seed.sql` runs on the local and dev stack only. Every seeded row is clearly fake (`@example.test` emails, names suffixed "(demo)") and has `is_demo = true` on content tables so it can be excluded from analytics and purged.
- No production data copied to dev. Tests create their own fixtures per test via SQL helper functions.

## Auth architecture (M1 design)

- Supabase Auth: email (magic link + optional password) and Google OAuth. The redirect allow-list holds only localhost and the Vercel preview domain.
- `@supabase/ssr` with cookie sessions. `src/proxy.ts` (Next 16's replacement for middleware) refreshes the session. Server components read the user via a cached `getUser()`. All writes go through server actions that re-check authorization; RLS is the second line.
- `profiles` row created by an `auth.users` trigger. Onboarding stores interests and approximate location (with an explicit consent row).
- Platform roles are bootstrapped by a one-off SQL statement for the founder's account, run manually with approval and written to the audit log.

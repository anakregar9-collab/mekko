# MEKKO

Slovenia-first discovery platform for creative and lifestyle activities. Current stage: **M1, accounts, profiles, organizer spaces and basic admin**, on Supabase. The M0 clickable prototype (demo data) is still under `/prototip`.

## Quick start

```bash
corepack enable
pnpm install
pnpm db:start     # local Supabase in Docker
pnpm db:env       # writes .env.local with LOCAL keys (never real secrets)
pnpm dev          # http://localhost:3000 → review hub
```

Login codes for local accounts arrive at http://127.0.0.1:54324 (Mailpit). See `docs/M1_NOTES.md`.

## Scripts

| Command | |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | typed routes + `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright + axe (run `pnpm build` first; first time also `pnpm exec playwright install chromium`) |
| `pnpm check` | typecheck + lint + unit |
| `pnpm db:start` / `db:stop` / `db:reset` | local Supabase stack |
| `pnpm db:test` | pgTAP RLS/authorization tests |
| `pnpm db:types` | regenerate `src/lib/db/types.ts` |

## Documents

- `PRODUCT_SPEC.md`, `MVP_ROADMAP.md`, `DECISIONS.md`: product source of truth
- `CLAUDE.md`: engineering operating rules
- `docs/M0_REVIEW.md`: state, spec contradictions, **decisions needed**
- `docs/DOMAIN_MODEL.md`: entities and ER diagram
- `docs/ROUTES_AND_AUTHZ.md`: route map and authorization matrix
- `docs/DESIGN_SYSTEM.md`: tokens and components
- `docs/M0_PLAN.md`: M0 checklist, test/CI/migration/rollback conventions
- `docs/M1_NOTES.md`: what M1 contains, security model, tests, pending founder actions

## Layout

```
src/app/page.tsx              M0 review hub
src/app/prototip/             clickable prototypes (noindex, demo banner)
  (obiskovalec)/              visitor shell: 4 tabs + 2 header icons
  organizator/, admin/        workspace shells
src/components/               ui primitives, visitor and workspace components
src/lib/domain/types.ts       canonical domain types (mirror DOMAIN_MODEL.md)
src/lib/demo/data.ts          DEMO data only
e2e/                          Playwright specs
```

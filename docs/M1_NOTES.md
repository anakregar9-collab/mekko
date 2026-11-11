# M1 — authentication, profiles, spaces, basic admin

Status: **implemented on branch `m1-auth-spaces`, verified locally.** The cloud dev database is not migrated yet (see "Pending founder actions").

## What's built

| Area | Routes | Notes |
|---|---|---|
| Login / sign-up | `/prijava` | Email → 6-digit code (Supabase email OTP). Works across devices and needs no redirect URL. `?naprej=` is restricted to same-site paths (open-redirect guard). Google sign-in is hidden until OAuth credentials exist (`google_auth_enabled` flag). |
| Onboarding | `/onboarding` | Name, @handle, interests, approximate city **only with explicit location consent**, profile visibility, optional marketing opt-in (off by default). |
| Visitor shell | `/odkrivanje`, `/moje-aktivnosti`, `/ustvari`, `/moj-mekko`, `/sporocila`, `/obvestila` | Same 4 tabs + 2 header icons as the prototype. Pages without M1 content show honest empty states. |
| Moj Mekko | `/moj-mekko`, `/profil`, `/zanimanja`, `/podatki` | Profile and privacy (public / signed-in only / private), interests, GDPR export and deletion requests, sign-out. |
| Organizer mode | `/organizator`, `/organizator/nov-prostor`, `/organizator/[space]`, `/ekipa`, `/nastavitve` | One shared space model for all 4 kinds. One-click "Začni kot ustvarjalec". Team invites by @handle (the invitee must accept), owner/admin/staff roles, remove/leave. Multiple spaces are free (20-per-user anti-abuse cap). |
| Admin | `/admin`, `/uporabniki`, `/prostori`, `/zahteve`, `/revizija` | Hidden (404) for non-staff. Suspend/reactivate requires a reason. GDPR request handling. Every sensitive action is written to the append-only audit log. |
| Restricted account | `/racun-omejen` | Suspended users are redirected here and cannot create or edit. |

## Security model (summary)

- **Database:** RLS on every table, deny by default, explicit column-level grants. All multi-row or privileged changes go through `SECURITY DEFINER` functions with a fixed `search_path`: spaces, invites, roles, admin status and data requests. The audit log can't be written by API roles.
- **App:** `src/lib/auth/dal.ts` is the only place that resolves the current user (`requireUser`, `requireSpaceRole`, `requirePlatformRole`). Every page and every server action re-checks. `src/proxy.ts` only refreshes the session and does an optimistic redirect to login.
- **Errors:** DB errors are mapped to Slovene messages (`src/lib/db/errors.ts`). Raw errors are never shown.
- **Secrets:** only the publishable key reaches the browser. The secret key is used only by local test setup.

## Tests

| Suite | Command | Result (2026-11-11, local) |
|---|---|---|
| Unit (Vitest) | `pnpm test` | 47 passed |
| DB / RLS (pgTAP) | `pnpm db:test` | 58 passed: profile visibility, column grants, consents, data requests, audit, suspension, spaces, invites, roles, cross-space isolation, one-owner rule, anon access |
| E2E (Playwright + axe) | `pnpm build && pnpm test:e2e` | 209 passed: M0 prototype at 5 widths, plus M1 journeys at 320/390/1280 px (guest, sign-up/onboarding/privacy/GDPR, unique handles, owner→admin→staff, outsider 404s, admin suspension + audit + restricted user) |

## Local development

```bash
pnpm install
pnpm db:start      # Supabase in Docker (first run downloads images)
pnpm db:env        # writes .env.local with LOCAL keys
pnpm dev           # http://localhost:3000
```

Login codes arrive in the local mailbox at http://127.0.0.1:54324 (Mailpit).

## Pending founder actions (needed before Vercel previews work end-to-end)

1. **Confirm the database migration** on the cloud `mekko-dev` project. The tool asked for confirmation and it timed out unanswered.
2. **Supabase Auth settings** (Dashboard → Authentication):
   - Email template "Magic Link": include `{{ .Token }}` (copy `supabase/templates/magic_link.html`).
   - URL configuration: Site URL and redirect URLs for the Vercel preview domain.
3. **Email sending:** the built-in Supabase mailer only delivers to org members and is heavily rate limited. For real users, connect **Resend** SMTP. This needs DNS records on `mekko.eu` (at Domenca) and a Resend API key entered in the Supabase dashboard (never in the repo).
4. **First admin:** after signing in once on dev, run `supabase/scripts/bootstrap_founder.sql` with your email (with your approval).
5. **Support mailbox:** the restricted-account page shows `podpora@mekko.eu`. Create the mailbox or tell me a different address.

## Known limitations / TODO

- GDPR export and deletion are request intake only. Fulfilment is manual (admin marks done). An automated export job is planned for later.
- Ownership transfer and space deletion are not built yet. A user who owns spaces must transfer them before deletion, which is handled manually for now.
- Public space page `/prostori/[slug]` arrives with M2, when there is content to show.
- Google OAuth waits for credentials.
- Real unread counts on the header icons arrive with notifications (M2) and messages (M3).

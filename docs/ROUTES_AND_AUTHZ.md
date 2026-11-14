# Routes, navigation and authorization

Status: **proposed** (M0). URLs are Slovene first. Localized aliases can come later through Next.js i18n routing. M0 prototypes live under `/prototip/*`, while the real routes below arrive from M1 onward.

## Navigation rules

- **Visitor (mobile-first):** one `<nav>` with exactly four tabs (Odkrivanje, Moje aktivnosti, Ustvari, Moj Mekko). It's a bottom bar on phones and becomes a left rail from `md`. The header has **two separate** icon links: Sporočila and Obvestila.
- **Organizer workspace (desktop-optimised):** sidebar at `lg`, horizontally scrolling tab strip on phones. It has a space switcher. You enter it from Moj Mekko → "Preklopi v način organizatorja" or from Ustvari → Dogodek.
- **Admin workspace:** same shell as organizer, separate menu, visible only to `platform_roles`.
- No duplicate menus. Detail pages keep the parent tab active.

## Visitor routes

| Route | Access | Notes |
|---|---|---|
| `/` | public | Odkrivanje feed (personalised order if signed in; search always browses everything) |
| `/iskanje?q=&kategorija=&kraj=&datum=` | public | search and filters, shareable URL state |
| `/dogodki/[slug]` | public preview / full when signed in | see M0_REVIEW #1. Private events need `?vabilo=<token>` |
| `/ideje/[slug]` | public preview / full when signed in | M4 |
| `/prostori/[slug]` | public | space page: overview, events, ideas, courses, membership join (no pricing until dues exist) |
| `/u/[handle]` | per profile privacy | personal public profile |
| `/moje-aktivnosti` (`?pogled=koledar`) | user | upcoming/past bookings, calendar (series expand to all sessions) |
| `/moje-aktivnosti/rezervacije/[id]` | booker | ticket, policy snapshot, cancel, add-to-calendar |
| `/ustvari` | user | central creation menu |
| `/ustvari/ideja` | user | M4 |
| `/moj-mekko` | user | profile, saved, library, settings, organizer switch |
| `/moj-mekko/shranjeno`, `/knjiznica`, `/nastavitve`, `/zasebnost`, `/obvestila`, `/podatki` | user | `/podatki` = GDPR export / delete request |
| `/sporocila`, `/sporocila/[id]`, `/sporocila/nov?komu=` | user; conversation = its two participants only (404 otherwise); first contact per `can_message()` | M3a (built) |
| `/moj-mekko/blokirani` | user | M3a (built) |
| `/obvestila` | user | service notifications |
| `/prijava`, `/registracija`, `/onboarding`, `/auth/callback` | guest | email + Google; onboarding = interests and approximate location |

## Organizer routes (`/organizator`)

| Route | Min. space role | Milestone |
|---|---|---|
| `/organizator` | any staff role in ≥1 space (else "create space") | M1 |
| `/organizator/nov-prostor` | user | M1 |
| `/organizator/[space]` (dashboard) | staff | M2 |
| `/organizator/[space]/dogodki`, `/dogodki/nov`, `/dogodki/[id]` | admin (create/edit), staff (view) | M2 |
| `/organizator/[space]/dogodki/[id]/udelezenci` | staff | M2 |
| `/organizator/[space]/koledar` | staff | M2 |
| `/organizator/[space]/clani` | admin | M4 |
| `/organizator/[space]/ekipa` | owner (roles), admin (invite staff) | M1 |
| `/organizator/[space]/finance`, `/izplacila` | owner (+ admin with `finance` grant) | M3 |
| `/organizator/[space]/nastavitve` | admin; transfer/delete space = owner | M1 |

## Admin routes (`/admin`)

| Route | Platform role |
|---|---|
| `/admin` | any platform role |
| `/admin/uporabniki`, `/[id]` | admin, support (read), super_admin (suspend/delete/roles) |
| `/admin/prostori`, `/admin/dogodki` | admin, moderator (view); verification approve/reject = admin, super_admin |
| `/admin/prijave` (moderation queue, built M3a) | moderator, admin, super_admin |
| `/admin/transakcije`, `/admin/izplacila`, exports | finance, super_admin |
| `/admin/podpora` | support, admin |
| `/admin/konfiguracija` (fees, quotas, categories, flags, promo) | super_admin (fees/flags), admin (categories) |
| `/admin/revizija` | super_admin (read-only; log is append-only) |

## Authorization matrix

Legend: ✅ allowed · 👁 read only · ◐ own/limited (see note) · — denied. "Space roles" are scoped to that one space. A user's role in another space grants nothing here.

| Action | Guest | User | Booker (own) | Space member | Space staff | Space admin | Space owner | Owner of *other* space | Moderator | Finance | Super admin | Suspended |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Browse public previews / search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See full event detail (address, online link) | — | ✅ | ✅ (+ online link) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ ¹ |
| See members-only / private event | — | ◐ invite | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ invite | 👁 | — | 👁 | — |
| Book / cancel own booking | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ cancel only |
| See participant list | — | — | — | — | 👁 | ✅ | ✅ | — | 👁 ² | — | 👁 ² | — |
| Create / edit / cancel event | — | — | — | — | ◐ ³ | ✅ | ✅ | — | ◐ unpublish | — | ✅ ² | — |
| Manage staff & roles | — | — | — | — | — | ◐ invite staff | ✅ | — | — | — | ✅ ² | — |
| Transfer / delete space | — | — | — | — | — | — | ✅ | — | — | — | ✅ ² | — |
| View space finances / payouts | — | — | — | — | — | ◐ ⁴ | ✅ | — | — | 👁 | 👁 | — |
| Issue refund | — | — | — | — | — | ◐ ⁴ | ✅ | — | — | ✅ ² | ✅ ² | — |
| Publish idea | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Send DM | — | ◐ ⁵ | ◐ ⁵ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| Report / block | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ report |
| Moderate content / suspend users | — | — | — | — | — | — | — | — | ✅ ² | — | ✅ ² | — |
| Configure fees / quotas / flags | — | — | — | — | — | — | — | — | — | — | ✅ ² | — |
| Read audit log | — | — | — | — | — | — | — | — | — | — | 👁 | — |

¹ Suspended users can still see details of events they have already booked.
² Every action is written to `admin_audit_log` with a reason. Platform staff access to private data is limited to what the task needs.
³ Staff can edit events assigned to them (e.g. instructor notes) but can't change price, capacity or policy.
⁴ Only if the owner grants the `finance` capability to that admin.
⁵ First-contact rules from M0_REVIEW #6.

## Enforcement

- **RLS on every table**, deny by default. Helper SQL functions `is_space_role(space_id, min_role)` and `has_platform_role(role)` are `STABLE SECURITY DEFINER` with a fixed `search_path`.
- Sensitive mutations (booking with capacity, refunds, role changes, publish with quota) go through server actions or route handlers that call SQL functions. The service-role key is server-only and never reaches client bundles.
- Each row of the matrix becomes an RLS test case in `supabase/tests` (pgTAP) from M1, plus Playwright journeys for guest, user, owner, admin, other-space owner, platform admin and suspended users.

# Design system — first pass

Status: **placeholder, not founder-approved** (PRODUCT_SPEC §9.8). Tokens live in `src/app/globals.css` (`@theme`). Components live in `src/components/ui`.

## Direction

Playful creative and warm, but uncluttered. Light theme only (dark is M6). Mobile-first for visitors and desktop-optimised for workspaces. Rounded shapes, soft colour fields, and one strong action colour. No hero banners. Photos will carry the colour later. Until then, decorative CSS covers (`<Cover>`) stand in and are `aria-hidden`.

## Colour tokens (all text pairs measured ≥ 4.5:1)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `cream` | `#FFF8F0` | app background | — |
| `surface` | `#FFFFFF` | cards, bars | — |
| `ink` | `#2A1F1A` | text | 15.2 on cream |
| `ink-muted` | `#6B5B52` | secondary text | 6.1 on cream, 6.5 on white |
| `line` | `#EADFD3` | borders, dividers | decorative |
| `brand` | `#C9432A` | primary buttons, active states | white text 4.9 |
| `brand-strong` / `brand-soft` | `#B23A22` / `#FDE6DC` | hover, tinted chips | 5.0 |
| `sun-ink` / `sun-soft` | `#7A5200` / `#FEF0CF` | ideas, warnings, "external" | 6.1 |
| `sage-ink` / `sage-soft` | `#2F6B4A` / `#DDEFE3` | availability, success | 5.3 |
| `lilac-ink` / `lilac-soft` | `#5B3FA8` / `#ECE5FA` | series/recurring, gated content | 6.3 |
| `sky-ink` / `sky-soft` | `#1F5F99` / `#DCEBF8` | online, verified | 5.5 |
| `clay-ink` / `clay-soft` | `#8A4A2A` / `#F6E2D3` | category | 5.4 |

## Typography

- Headings: **Bricolage Grotesque**, 700–800, tight tracking. Body: **Figtree**. Both are loaded with `latin-ext` for č/š/ž.
- Scale: page title `text-3xl`, section `text-lg`/`text-xl`, body `text-base` (16px, so iOS doesn't zoom on inputs), meta `text-sm`, badge `text-xs`.

## Shape, spacing, elevation

- Card radius `1.25rem`, chips and buttons fully rounded, inputs `rounded-xl`.
- 16px page gutter on phones and 32px on desktop. Content max width `5xl` for visitors.
- One shadow token, `--shadow-card`. No stacked shadows.

## Components (M0)

| Component | File | Notes |
|---|---|---|
| Button / ButtonLink | `ui/button.tsx` | primary / secondary / ghost; `md`/`lg` ≥ 44px tall |
| Badge | `ui/badge.tsx` | tones match colour tokens |
| Cover | `ui/cover.tsx` | decorative placeholder art |
| PrototypeAction | `prototype-action.tsx` | **prototype only**: explains what is not wired yet, so there are no dead buttons |
| VisitorNav, AppHeader | `visitor/*` | single nav, two header icons |
| WorkspaceShell, StatTile, Panel | `workspace/*` | organizer and admin |
| EventCard, IdeaCard, DiscoveryFeed, EventDetail, MyActivities, CreateEventFlow | `visitor/*` | screens built from the canonical domain types |

## Accessibility baseline

- Visible `:focus-visible` ring (3px brand). `prefers-reduced-motion` is respected.
- Touch targets ≥ 44×44 for nav, icons and primary actions.
- Icon-only links have `aria-label`, and unread counts are announced in the label.
- Toggles use `aria-pressed`, the current tab uses `aria-current="page"`, and stepper steps use `aria-current="step"`.
- Every E2E run executes **axe** (WCAG 2.1 A/AA) and fails on serious or critical violations, at 320/375/390/430 px and 1280 px.

## Open for approval

Logo / wordmark, final palette, font pairing, illustration style, photo guidelines, and the tone of microcopy (informal "ti" is used throughout).

/**
 * Navigation config — single source of truth for the visitor tabs and
 * organizer/admin workspace menus. PRODUCT_SPEC §2: exactly four visitor tabs.
 */

export const PROTO = "/prototip";

export type VisitorTabKey = "odkrivanje" | "moje-aktivnosti" | "ustvari" | "moj-mekko";

export interface VisitorTab {
  key: VisitorTabKey;
  label: string;
  href: string;
  /** Extra path prefixes that keep this tab active (e.g. event detail belongs to Odkrivanje). */
  activePrefixes: string[];
}

/** Base path: "" for the real app, "/prototip" for the M0 demo prototype. */
export type NavBase = "" | typeof PROTO;

export function makeVisitorTabs(base: NavBase): readonly VisitorTab[] {
  return [
    {
      key: "odkrivanje",
      label: "Odkrivanje",
      href: `${base}/odkrivanje`,
      activePrefixes: [`${base}/dogodki`, `${base}/ideje`, `${base}/prostori`],
    },
    { key: "moje-aktivnosti", label: "Moje aktivnosti", href: `${base}/moje-aktivnosti`, activePrefixes: [] },
    { key: "ustvari", label: "Ustvari", href: `${base}/ustvari`, activePrefixes: [] },
    { key: "moj-mekko", label: "Moj Mekko", href: `${base}/moj-mekko`, activePrefixes: [] },
  ];
}

/** Prototype tabs (kept for existing imports/tests). */
export const visitorTabs = makeVisitorTabs(PROTO);

export function activeVisitorTab(pathname: string, base: NavBase = PROTO): VisitorTabKey | null {
  for (const tab of makeVisitorTabs(base)) {
    const prefixes = [tab.href, ...tab.activePrefixes];
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return tab.key;
  }
  return null;
}

export interface WorkspaceLink {
  label: string;
  /** null = not built yet, rendered as disabled "Kmalu". ":space" is replaced with the current space slug. */
  href: string | null;
  milestone?: string;
}

/** Real organizer menu for one space (M1). */
export const liveSpaceLinks: readonly WorkspaceLink[] = [
  { label: "Pregled", href: "/organizator/:space" },
  { label: "Dogodki", href: "/organizator/:space/dogodki" },
  { label: "Ekipa", href: "/organizator/:space/ekipa" },
  { label: "Nastavitve prostora", href: "/organizator/:space/nastavitve" },
  { label: "Finance", href: null, milestone: "M3" },
];

export const liveOrganizerHomeLinks: readonly WorkspaceLink[] = [
  { label: "Moji prostori", href: "/organizator" },
  { label: "Nov prostor", href: "/organizator/nov-prostor" },
];

export const liveAdminLinks: readonly WorkspaceLink[] = [
  { label: "Pregled", href: "/admin" },
  { label: "Uporabniki", href: "/admin/uporabniki" },
  { label: "Prostori", href: "/admin/prostori" },
  { label: "Prijave vsebin", href: "/admin/prijave" },
  { label: "Zahteve GDPR", href: "/admin/zahteve" },
  { label: "Revizijska sled", href: "/admin/revizija" },
  { label: "Moderacija", href: null, milestone: "M3" },
  { label: "Transakcije", href: null, milestone: "M3" },
];

export const organizerLinks: readonly WorkspaceLink[] = [
  { label: "Pregled", href: `${PROTO}/organizator` },
  { label: "Dogodki", href: null, milestone: "M2" },
  { label: "Koledar", href: null, milestone: "M2" },
  { label: "Udeleženci", href: null, milestone: "M2" },
  { label: "Člani", href: null, milestone: "M4" },
  { label: "Ekipa", href: null, milestone: "M1" },
  { label: "Finance", href: null, milestone: "M3" },
  { label: "Nastavitve prostora", href: null, milestone: "M1" },
];

export const adminLinks: readonly WorkspaceLink[] = [
  { label: "Pregled", href: `${PROTO}/admin` },
  { label: "Uporabniki", href: null, milestone: "M1" },
  { label: "Prostori", href: null, milestone: "M1" },
  { label: "Moderacija", href: null, milestone: "M3" },
  { label: "Transakcije", href: null, milestone: "M3" },
  { label: "Podpora", href: null, milestone: "M3" },
  { label: "Konfiguracija", href: null, milestone: "M1" },
  { label: "Revizijska sled", href: null, milestone: "M1" },
];

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

export const visitorTabs: readonly VisitorTab[] = [
  {
    key: "odkrivanje",
    label: "Odkrivanje",
    href: `${PROTO}/odkrivanje`,
    activePrefixes: [`${PROTO}/dogodki`, `${PROTO}/ideje`, `${PROTO}/prostori`],
  },
  {
    key: "moje-aktivnosti",
    label: "Moje aktivnosti",
    href: `${PROTO}/moje-aktivnosti`,
    activePrefixes: [],
  },
  { key: "ustvari", label: "Ustvari", href: `${PROTO}/ustvari`, activePrefixes: [] },
  { key: "moj-mekko", label: "Moj Mekko", href: `${PROTO}/moj-mekko`, activePrefixes: [] },
] as const;

export function activeVisitorTab(pathname: string): VisitorTabKey | null {
  for (const tab of visitorTabs) {
    const prefixes = [tab.href, ...tab.activePrefixes];
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return tab.key;
  }
  return null;
}

export interface WorkspaceLink {
  label: string;
  href: string | null; // null = not built yet, rendered as disabled "Kmalu"
  milestone?: string;
}

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

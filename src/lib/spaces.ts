import type { Database } from "@/lib/db/types";

export type SpaceKind = Database["public"]["Enums"]["space_kind"];
export type SpaceRoleName = Database["public"]["Enums"]["space_role"];

export const spaceKinds: { v: SpaceKind; l: string; d: string }[] = [
  { v: "solo_creator", l: "Ustvarjalec", d: "Samostojno vodiš delavnice ali ustvarjaš." },
  { v: "community", l: "Skupnost", d: "Krožek ali skupina z rednimi srečanji in člani." },
  { v: "studio", l: "Studio", d: "Prostor z ekipo, urnikom in več vodji." },
  { v: "association", l: "Društvo", d: "Društvo ali organizacija z več programi." },
];

export const spaceKindLabel: Record<SpaceKind, string> = {
  solo_creator: "Ustvarjalec",
  community: "Skupnost",
  studio: "Studio",
  association: "Društvo",
};

export const roleLabel: Record<SpaceRoleName, string> = {
  owner: "Lastnik",
  admin: "Skrbnik",
  staff: "Sodelavec",
  member: "Član",
};

export type LegalForm = "company" | "sole_trader" | "association" | "odd" | "private";

/** Organizer legal status (marketplace information duty). Wording pending legal review. */
export const legalForms: { v: LegalForm; l: string; d: string }[] = [
  { v: "company", l: "Podjetje", d: "d.o.o., d.d. ali druga gospodarska družba" },
  { v: "sole_trader", l: "Samostojni podjetnik (s.p.)", d: "Registrirana dejavnost kot s.p." },
  { v: "association", l: "Društvo ali zavod", d: "Društvo, zavod ali druga nevladna organizacija" },
  { v: "odd", l: "Osebno dopolnilno delo (ODD)", d: "Vpis v evidenco ODD pri AJPES in vrednotnica" },
  { v: "private", l: "Zasebnik", d: "Nimam registrirane dejavnosti (občasno, nepridobitno)" },
];

export const legalFormLabel: Record<LegalForm, string> = Object.fromEntries(
  legalForms.map((f) => [f.v, f.l]),
) as Record<LegalForm, string>;

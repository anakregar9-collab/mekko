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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole, requireUser } from "@/lib/auth/dal";
import { ljubljanaToISO } from "@/lib/format";
import { reasonSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const errors: Record<string, string> = {
  membership_closed: "Ta prostor ne sprejema članov.",
  already_member: "Že si član/-ica ali pa tvoja prošnja čaka.",
  members_only: "Dogodek je samo za člane prostora.",
  seats_available: "Mesta so še prosta – kar prijavi se.",
  invalid_quantity: "Neveljavno število oseb.",
  event_not_bookable: "Na ta dogodek se trenutno ni mogoče prijaviti.",
  session_not_editable: "Tega termina ni več mogoče spremeniti.",
  invalid_session_time: "Termin mora biti v prihodnosti, konec pa po začetku.",
  reason_required: "Vpiši razlog.",
  invalid_message: "Sporočilo naj ima od 1 do 3000 znakov.",
  rate_limited: "Danes ste objavili že veliko obvestil.",
  not_allowed: "Za to nimaš dovoljenja.",
};
const friendly = (m?: string) => (m && errors[m]) || "Nekaj je šlo narobe. Poskusi znova.";

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
export async function joinSpace(fd: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("join_space", { p_space: String(fd.get("space_id")) });
  revalidatePath(`/prostori/${String(fd.get("slug"))}`);
}

export async function leaveSpace(fd: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("leave_space", { p_space: String(fd.get("space_id")) });
  revalidatePath(`/prostori/${String(fd.get("slug"))}`);
}

export async function respondMember(spaceSlug: string, fd: FormData): Promise<void> {
  const { space } = await requireSpaceRole(spaceSlug, "admin");
  const supabase = await createClient();
  await supabase.rpc("respond_member_request", {
    p_space: space.id,
    p_profile: String(fd.get("profile_id")),
    p_accept: fd.get("accept") === "1",
  });
  revalidatePath(`/organizator/${spaceSlug}/clani`);
}

export async function removeMember(spaceSlug: string, fd: FormData): Promise<void> {
  const { space } = await requireSpaceRole(spaceSlug, "admin");
  const supabase = await createClient();
  await supabase.rpc("remove_space_member", { p_space: space.id, p_profile: String(fd.get("profile_id")) });
  revalidatePath(`/organizator/${spaceSlug}/clani`);
}

export async function setMembershipMode(
  spaceSlug: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { space } = await requireSpaceRole(spaceSlug, "admin");
  const mode = String(fd.get("membership_mode"));
  if (!["none", "open", "approval"].includes(mode)) return { message: "Neveljavna izbira." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ membership_mode: mode as "none" | "open" | "approval" })
    .eq("id", space.id);
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}`, "layout");
  revalidatePath(`/prostori/${spaceSlug}`);
  return { ok: true, message: "Shranjeno." };
}

export async function postAnnouncement(
  spaceSlug: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { space } = await requireSpaceRole(spaceSlug, "staff");
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { errors: { body: "Napiši obvestilo." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_space_post", { p_space: space.id, p_body: body });
  if (error) return { message: friendly(error.message), values: { body } };
  revalidatePath(`/organizator/${spaceSlug}/clani`);
  revalidatePath(`/prostori/${spaceSlug}`);
  return { ok: true, message: "Obvestilo je objavljeno in poslano članom." };
}

export async function removeAnnouncement(spaceSlug: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "staff");
  const supabase = await createClient();
  await supabase.rpc("remove_space_post", { p_post: String(fd.get("post_id")) });
  revalidatePath(`/organizator/${spaceSlug}/clani`);
  revalidatePath(`/prostori/${spaceSlug}`);
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------
export async function joinWaitlist(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser({ next: `/dogodki/${slug}` });
  const occ = String(fd.get("occurrence_id") ?? "") || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", {
    p_event: String(fd.get("event_id")),
    p_occurrence: occ as string,
    p_quantity: Number(fd.get("quantity") ?? 1) || 1,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/dogodki/${slug}`);
  return { ok: true, message: "Si na čakalni listi. Obvestimo te, ko se sprosti mesto." };
}

export async function leaveWaitlist(fd: FormData): Promise<void> {
  await requireUser();
  const occ = String(fd.get("occurrence_id") ?? "") || null;
  const supabase = await createClient();
  await supabase.rpc("leave_waitlist", { p_event: String(fd.get("event_id")), p_occurrence: occ as string });
  revalidatePath(`/dogodki/${String(fd.get("slug"))}`);
}

// ---------------------------------------------------------------------------
// Sessions (organizer)
// ---------------------------------------------------------------------------
function readSlot(fd: FormData): { starts: string; ends: string } | string {
  const date = String(fd.get("date") ?? "");
  const start = String(fd.get("start") ?? "");
  const end = String(fd.get("end") ?? "");
  if (!date || !start || !end) return "Vpiši datum ter uro začetka in konca.";
  try {
    const starts = ljubljanaToISO(date, start);
    const ends = ljubljanaToISO(date, end);
    if (Date.parse(ends) <= Date.parse(starts)) return "Konec mora biti po začetku.";
    if (Date.parse(starts) <= Date.now()) return "Termin mora biti v prihodnosti.";
    return { starts, ends };
  } catch {
    return "Neveljaven datum ali ura.";
  }
}

export async function rescheduleSession(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const slot = readSlot(fd);
  if (typeof slot === "string") return { message: slot };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_occurrence", {
    p_occ: String(fd.get("occurrence_id")),
    p_starts: slot.starts,
    p_ends: slot.ends,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  return { ok: true, message: `Termin je premaknjen. Obveščenih: ${data ?? 0}.` };
}

export async function cancelSession(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_occurrence", {
    p_occ: String(fd.get("occurrence_id")),
    p_reason: reason.data,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  return { ok: true, message: `Termin je odpovedan. Obveščenih: ${data ?? 0}.` };
}

export async function addSession(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const slot = readSlot(fd);
  if (typeof slot === "string") return { message: slot };
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_occurrences")
    .insert({ event_id: eventId, starts_at: slot.starts, ends_at: slot.ends });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  return { ok: true, message: "Termin je dodan." };
}

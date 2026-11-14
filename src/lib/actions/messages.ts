"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole, requireUser } from "@/lib/auth/dal";
import { reasonSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const messageErrors: Record<string, string> = {
  cannot_message: "Tej osebi trenutno ne moreš pisati.",
  cannot_message_self: "Sebi ne moreš pisati.",
  invalid_message_body: "Sporočilo naj ima od 1 do 2000 znakov.",
  rate_limited: "Poslal/-a si veliko sporočil v kratkem času. Poskusi čez nekaj minut.",
  conversation_not_found: "Pogovora ni bilo mogoče najti.",
  already_reported: "To si že prijavil/-a. Moderatorji si bodo prijavo ogledali.",
  report_target_not_found: "Vsebine ni bilo mogoče najti.",
  cannot_block_self: "Sebe ne moreš blokirati.",
  user_not_found: "Uporabnika ni bilo mogoče najti.",
  not_allowed: "Za to nimaš dovoljenja.",
  reason_required: "Vpiši razlog.",
  invalid_status: "Tega trenutno ni mogoče spremeniti.",
};
const friendly = (msg: string | undefined, fallback = "Nekaj je šlo narobe. Poskusi znova.") =>
  (msg && messageErrors[msg]) || fallback;

const bodySchema = z
  .string()
  .trim()
  .min(1, "Napiši sporočilo.")
  .max(2000, "Sporočilo je predolgo (največ 2000 znakov).");

const uuid = z.uuid();

/** "Piši organizatorju" from an event or space page: starts or continues a conversation with the space owner. */
export async function contactSpace(
  spaceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const body = bodySchema.safeParse(formData.get("body"));
  if (!body.success) return { errors: { body: body.error.issues[0].message } };
  if (!uuid.safeParse(spaceId).success) return { message: friendly("cannot_message") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contact_space", { p_space: spaceId, p_body: body.data });
  if (error || !data) return { message: friendly(error?.message), values: { body: body.data } };
  revalidatePath("/sporocila");
  redirect(`/sporocila/${data}`);
}

/** Organizer → attendee (or any allowed person) by profile id. */
export async function startConversation(
  toId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const body = bodySchema.safeParse(formData.get("body"));
  if (!body.success) return { errors: { body: body.error.issues[0].message } };
  if (!uuid.safeParse(toId).success) return { message: friendly("cannot_message") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_to: toId, p_body: body.data });
  if (error || !data) return { message: friendly(error?.message), values: { body: body.data } };
  revalidatePath("/sporocila");
  redirect(`/sporocila/${data}`);
}

export async function sendMessage(
  conversationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const body = bodySchema.safeParse(formData.get("body"));
  if (!body.success) return { errors: { body: body.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", { p_conversation: conversationId, p_body: body.data });
  if (error) return { message: friendly(error.message), values: { body: body.data } };
  revalidatePath(`/sporocila/${conversationId}`);
  revalidatePath("/sporocila");
  return { ok: true };
}

export async function setBlocked(formData: FormData): Promise<void> {
  await requireUser();
  const profileId = String(formData.get("profile_id"));
  if (!uuid.safeParse(profileId).success) return;
  const supabase = await createClient();
  if (formData.get("block") === "1") {
    await supabase.rpc("block_user", { p_profile: profileId });
  } else {
    await supabase.rpc("unblock_user", { p_profile: profileId });
  }
  const back = String(formData.get("back") ?? "");
  revalidatePath("/sporocila", "layout");
  revalidatePath("/moj-mekko/blokirani");
  if (back.startsWith("/")) revalidatePath(back);
}

const reportSchema = z.object({
  target_type: z.enum(["profile", "message", "event", "space"]),
  target_id: z.string().min(1).max(64),
  reason: z.enum(["spam", "harassment", "inappropriate", "scam", "copyright", "other"], {
    error: "Izberi razlog.",
  }),
  details: z.string().trim().max(1000, "Največ 1000 znakov.").optional(),
});

export async function reportContent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = reportSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    reason: formData.get("reason") || undefined,
    details: formData.get("details") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { errors: { [String(issue.path[0])]: issue.message } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_type: parsed.data.target_type,
    p_target: parsed.data.target_id,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? "",
  });
  if (error) return { message: friendly(error.message) };
  return { ok: true, message: "Hvala. Prijavo smo prejeli in si jo bomo ogledali." };
}

// ---------------------------------------------------------------------------
// Moderation + verification
// ---------------------------------------------------------------------------
export async function resolveReport(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin", "moderator"]);
  const status = String(formData.get("status"));
  if (status !== "actioned" && status !== "dismissed") return { message: "Neveljaven status." };
  const note = reasonSchema.safeParse(formData.get("reason"));
  if (!note.success) return { errors: { reason: note.error.issues[0].message } };
  const supabase = await createClient();
  if (formData.get("remove_message") === "1") {
    const { error } = await supabase.rpc("admin_remove_message", {
      p_message: Number(formData.get("message_id")),
      p_reason: note.data,
    });
    if (error) return { message: friendly(error.message) };
  }
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report: String(formData.get("report_id")),
    p_status: status,
    p_note: note.data,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Prijava je obravnavana." };
}

export async function setSpaceVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin"]);
  const status = String(formData.get("status"));
  if (status !== "verified" && status !== "rejected") return { message: "Neveljaven status." };
  const note = reasonSchema.safeParse(formData.get("reason"));
  if (!note.success) return { errors: { reason: note.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_space_verification", {
    p_space: String(formData.get("space_id")),
    p_status: status,
    p_reason: note.data,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "verified" ? "Prostor je preverjen." : "Preverjanje je zavrnjeno." };
}

export async function requestVerification(
  spaceSlug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_space_verification", {
    p_space: String(formData.get("space_id")),
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}`);
  return { ok: true, message: "Zahteva je oddana. Ekipa Mekko te bo kontaktirala." };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/auth/dal";
import { friendlyDbError } from "@/lib/db/errors";
import { reasonSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

export async function setUserStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin"]);
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "suspended") return { message: "Neveljaven status." };
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_profile_status", {
    p_profile: String(formData.get("profile_id")),
    p_status: status,
    p_reason: reason.data,
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "suspended" ? "Račun je omejen." : "Račun je ponovno aktiven." };
}

export async function resolveDataRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin", "support"]);
  const status = String(formData.get("status"));
  if (!["in_progress", "done", "rejected"].includes(status)) return { message: "Neveljaven status." };
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_data_request", {
    p_request: String(formData.get("request_id")),
    p_status: status as "in_progress" | "done" | "rejected",
    p_reason: reason.data,
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Zahteva je posodobljena." };
}

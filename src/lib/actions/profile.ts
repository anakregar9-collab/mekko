"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/legal";
import { requireUser } from "@/lib/auth/dal";
import { friendlyDbError } from "@/lib/db/errors";
import { fieldErrors, onboardingSchema, profileSchema, safeNext } from "@/lib/validation";
import type { FormState } from "@/components/forms";

function readProfile(formData: FormData) {
  return {
    display_name: String(formData.get("display_name") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    approx_city: String(formData.get("approx_city") ?? ""),
    visibility: String(formData.get("visibility") ?? "members"),
  };
}

function echo(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v ?? "")]),
  );
}

/** Record a consent change only when it differs from the latest recorded state. */
async function recordConsent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  kind: "approx_location" | "marketing_email",
  granted: boolean,
  source: string,
) {
  const { data: last } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("profile_id", profileId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && last.granted === granted) return;
  if (!last && !granted && source !== "onboarding") return;
  await supabase.from("user_consents").insert({ profile_id: profileId, kind, granted, source });
}

export async function saveOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser({ allowUnonboarded: true, allowTermsPending: true });
  const raw = {
    ...readProfile(formData),
    interests: formData.getAll("interests").map(String),
    location_consent: formData.get("location_consent") === "on",
  };
  const parsed = onboardingSchema.safeParse(raw);
  const termsOk = formData.get("accept_terms") === "on";
  if (!parsed.success || !termsOk)
    return {
      errors: {
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(termsOk ? {} : { accept_terms: "Za nadaljevanje sprejmi Pogoje uporabe." }),
      },
      values: {
        ...echo(raw),
        marketing_email: formData.get("marketing_email") === "on" ? "on" : "",
        nonce: Math.random().toString(36).slice(2),
      },
      message: "Preveri označena polja.",
    };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      handle: d.handle,
      bio: d.bio || null,
      approx_city: d.location_consent && d.approx_city ? d.approx_city : null,
      visibility: d.visibility,
      onboarded_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (error) {
    const msg = friendlyDbError(error);
    return { errors: error.code === "23505" ? { handle: msg } : undefined, message: msg, values: echo(raw) };
  }
  const { error: intErr } = await supabase.rpc("set_my_interests", { p_interest_ids: d.interests });
  if (intErr) return { message: friendlyDbError(intErr), values: echo(raw) };

  await recordConsent(supabase, profile.id, "approx_location", d.location_consent, "onboarding");
  await recordConsent(
    supabase,
    profile.id,
    "marketing_email",
    formData.get("marketing_email") === "on",
    "onboarding",
  );

  redirect(safeNext(String(formData.get("naprej") ?? ""), "/moj-mekko"));
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser();
  const raw = readProfile(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: raw, message: "Preveri označena polja." };
  const d = parsed.data;
  const locationConsent = formData.get("location_consent") === "on";
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      handle: d.handle,
      bio: d.bio || null,
      approx_city: locationConsent && d.approx_city ? d.approx_city : null,
      visibility: d.visibility,
    })
    .eq("id", profile.id);
  if (error) {
    const msg = friendlyDbError(error);
    return { errors: error.code === "23505" ? { handle: msg } : undefined, message: msg, values: raw };
  }
  await recordConsent(supabase, profile.id, "approx_location", locationConsent, "settings");
  await recordConsent(
    supabase,
    profile.id,
    "marketing_email",
    formData.get("marketing_email") === "on",
    "settings",
  );
  revalidatePath("/moj-mekko", "layout");
  return { ok: true, message: "Shranjeno." };
}

export async function updateInterests(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const ids = formData
    .getAll("interests")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length > 20) return { message: "Izberi največ 20 zanimanj." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_interests", { p_interest_ids: ids });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath("/moj-mekko", "layout");
  return { ok: true, message: "Zanimanja so shranjena." };
}

export async function requestData(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser();
  const kind = formData.get("kind");
  if (kind !== "export" && kind !== "deletion") return { message: "Neveljavna zahteva." };
  if (kind === "deletion" && formData.get("confirm") !== "on") {
    return { message: "Za zahtevo za izbris potrdi, da razumeš posledice." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("data_requests").insert({ profile_id: profile.id, kind });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath("/moj-mekko/podatki");
  return {
    ok: true,
    message:
      kind === "export"
        ? "Zahteva za izvoz je oddana. Podatke ti pošljemo po e-pošti v največ 30 dneh."
        : "Zahteva za izbris je oddana. Pred izbrisom te bomo kontaktirali po e-pošti.",
  };
}

/** Existing users accept a new version of the terms and privacy policy. */
export async function acceptTerms(formData: FormData): Promise<void> {
  const profile = await requireUser({ allowTermsPending: true });
  const naprej = String(formData.get("naprej") ?? "");
  if (formData.get("accept_terms") !== "on")
    redirect(`/pogoji-potrditev?napaka=1${naprej ? `&naprej=${encodeURIComponent(naprej)}` : ""}`);
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() })
    .eq("id", profile.id);
  redirect(safeNext(naprej, "/moj-mekko"));
}

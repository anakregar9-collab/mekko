"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole, requireUser } from "@/lib/auth/dal";
import { ljubljanaToISO, priceToCents } from "@/lib/format";
import type { FormState } from "@/components/forms";

const errors: Record<string, string> = {
  legal_info_required: "Za prodajo kart najprej v Nastavitvah prostora izpolni pravni status organizatorja.",
  pass_not_available: "Ta karta ni več na voljo.",
  pass_already_requested: "To karto si že naročil/-a – čaka na potrditev plačila.",
  rate_limited: "Imaš preveč odprtih naročil kart. Počakaj na potrditev.",
  pass_not_found: "Karte ni bilo mogoče najti.",
  invalid_status: "Tega trenutno ni mogoče spremeniti.",
  reason_required: "Vpiši razlog.",
  invalid_date: "Novi datum mora biti po sedanjem izteku (in največ 3 leta naprej).",
  pass_not_valid: "Ta karta ni veljavna za ta dogodek.",
  pass_expired: "Karta na dan termina ne velja več.",
  pass_no_visits: "Na karti ni dovolj obiskov.",
  pass_not_accepted: "Na ta dogodek se ni mogoče prijaviti s karto.",
  sold_out: "Termin je zaseden.",
  already_booked: "Na ta termin si že prijavljen/-a.",
  event_not_bookable: "Na ta termin se ni več mogoče prijaviti.",
  invalid_quantity: "Neveljavno število oseb.",
  members_only: "Dogodek je samo za člane prostora.",
  not_allowed: "Za to nimaš dovoljenja.",
};
const friendly = (m?: string) => (m && errors[m]) || "Nekaj je šlo narobe. Poskusi znova.";
const uuid = z.uuid();
const httpsLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Povezava mora začeti s https://");

// ---------------------------------------------------------------------------
// Organizer
// ---------------------------------------------------------------------------
const typeSchema = z.object({
  name: z.string().trim().min(2, "Vsaj 2 znaka.").max(80),
  description: z.string().trim().max(500).optional().default(""),
  visits: z.coerce.number().int("Celo število.").min(1, "Vsaj 1 obisk.").max(100, "Največ 100 obiskov."),
  price: z.string().trim(),
  validity_days: z.coerce.number().int("Celo število.").min(7, "Vsaj 7 dni.").max(730, "Največ 730 dni."),
  payment_instructions: z.string().trim().min(5, "Napiši, kako naj kupci plačajo.").max(1000),
  payment_link: httpsLink,
});

export async function createPassType(spaceSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { space, profile } = await requireSpaceRole(spaceSlug, "admin");
  const raw = Object.fromEntries(
    ["name", "description", "visits", "price", "validity_days", "payment_instructions", "payment_link"].map(
      (k) => [k, String(fd.get(k) ?? "")],
    ),
  );
  const parsed = typeSchema.safeParse(raw);
  const errs: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
  const cents = priceToCents(raw.price);
  if (cents === null || cents < 50 || cents > 500000) errs.price = "Vpiši ceno med 0,50 in 5000 €.";
  if (!parsed.success || Object.keys(errs).length)
    return { errors: errs, values: raw, message: "Preveri označena polja." };
  if (!space.legal_form) return { message: errors.legal_info_required, values: raw };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("pass_types").insert({
    space_id: space.id,
    name: d.name,
    description: d.description || null,
    visits: d.visits,
    price_cents: cents!,
    validity_days: d.validity_days,
    payment_instructions: d.payment_instructions,
    payment_link: d.payment_link || null,
    created_by: profile.id,
  });
  if (error) return { message: friendly(error.message), values: raw };
  revalidatePath(`/organizator/${spaceSlug}/karte`);
  revalidatePath(`/prostori/${spaceSlug}`);
  return { ok: true, message: "Karta je dodana in vidna na strani prostora." };
}

export async function setPassTypeActive(spaceSlug: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "admin");
  const id = String(fd.get("type_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase
    .from("pass_types")
    .update({ active: fd.get("active") === "1" })
    .eq("id", id);
  revalidatePath(`/organizator/${spaceSlug}/karte`);
  revalidatePath(`/prostori/${spaceSlug}`);
}

export async function confirmPass(spaceSlug: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "admin");
  const id = String(fd.get("pass_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("confirm_pass", { p_pass: id });
  revalidatePath(`/organizator/${spaceSlug}`, "layout");
}

export async function cancelPass(spaceSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!reason) return { errors: { reason: "Vpiši razlog (kupec ga vidi)." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_pass", {
    p_pass: String(fd.get("pass_id")),
    p_reason: reason,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}`, "layout");
  return { ok: true, message: "Karta je preklicana, kupec je obveščen." };
}

export async function extendPass(spaceSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const date = String(fd.get("until") ?? "");
  let until: string;
  try {
    until = ljubljanaToISO(date, "23:59");
  } catch {
    return { errors: { until: "Izberi datum." } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("extend_pass", { p_pass: String(fd.get("pass_id")), p_until: until });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}/karte`);
  return { ok: true, message: "Veljavnost je podaljšana, kupec je obveščen." };
}

// ---------------------------------------------------------------------------
// Buyer
// ---------------------------------------------------------------------------
export async function requestPass(spaceSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser({ next: `/prostori/${spaceSlug}` });
  const id = String(fd.get("type_id"));
  if (!uuid.safeParse(id).success) return { message: errors.pass_not_available };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_pass", { p_type: id });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/prostori/${spaceSlug}`);
  revalidatePath("/moj-mekko/karte");
  return {
    ok: true,
    message: "Karta je naročena. Plačaj po navodilih; organizator jo aktivira, ko prejme plačilo.",
  };
}

export async function withdrawPass(fd: FormData): Promise<void> {
  await requireUser();
  const id = String(fd.get("pass_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("withdraw_pass", { p_pass: id });
  revalidatePath("/moj-mekko/karte");
  const back = String(fd.get("back") ?? "");
  if (back.startsWith("/")) revalidatePath(back);
}

export async function bookWithPass(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser({ next: `/dogodki/${slug}` });
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_with_pass", {
    p_event: String(fd.get("event_id")),
    p_occurrence: String(fd.get("occurrence_id")),
    p_quantity: Number(fd.get("quantity") ?? 1) || 1,
    p_pass: String(fd.get("pass_id")),
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/dogodki/${slug}`);
  revalidatePath("/moje-aktivnosti");
  revalidatePath("/moj-mekko/karte");
  return { ok: true, message: "Prijavljen/-a si s karto." };
}

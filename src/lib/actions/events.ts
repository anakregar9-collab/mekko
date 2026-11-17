"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole } from "@/lib/auth/dal";
import { friendlyDbError } from "@/lib/db/errors";
import { fieldErrors, reasonSchema } from "@/lib/validation";
import { ljubljanaToISO, priceToCents } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { removeOldPhoto, uploadPhotoFromForm } from "@/lib/media-server";
import type { FormState } from "@/components/forms";

const COVERS = ["coral", "sun", "sage", "lilac", "sky", "clay"] as const;

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Vsaj 3 znaki.").max(120),
    summary: z.string().trim().max(200, "Največ 200 znakov.").optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    interest_id: z.coerce.number().int().positive().optional(),
    schedule: z.enum(["one_off", "multi_session"]),
    registration_mode: z.enum(["native", "external"]),
    external_url: z.string().trim().optional().default(""),
    is_online: z.boolean(),
    beginner_friendly: z.boolean(),
    family_friendly: z.boolean(),
    city: z.string().trim().max(80).optional().default(""),
    address: z.string().trim().max(200).optional().default(""),
    online_url: z.string().trim().optional().default(""),
    capacity: z.string().trim().optional().default(""),
    max_per_booking: z.coerce.number().int().min(1).max(10),
    materials: z.string().trim().max(1000).optional().default(""),
    cancellation_policy: z.enum(["flexible", "moderate", "strict"]),
    cover: z.enum(COVERS),
    payment_mode: z.enum(["free", "manual"]),
    price: z.string().trim().optional().default(""),
    payment_instructions: z.string().trim().max(1000, "Največ 1000 znakov.").optional().default(""),
    payment_deadline_hours: z.enum(["", "24", "48", "72", "168"]).optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.registration_mode === "external" && !/^https:\/\/\S+$/.test(d.external_url))
      ctx.addIssue({ code: "custom", path: ["external_url"], message: "Povezava mora začeti s https://" });
    if (d.is_online && d.online_url && !/^https:\/\/\S+$/.test(d.online_url))
      ctx.addIssue({ code: "custom", path: ["online_url"], message: "Povezava mora začeti s https://" });
    if (!d.is_online && !d.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Vpiši kraj." });
    if (
      d.capacity &&
      !(Number.isInteger(Number(d.capacity)) && Number(d.capacity) >= 1 && Number(d.capacity) <= 10000)
    )
      ctx.addIssue({ code: "custom", path: ["capacity"], message: "Celo število od 1 do 10000 ali prazno." });
    if (d.registration_mode === "native" && d.payment_mode === "manual") {
      const cents = priceToCents(d.price);
      if (cents === null || cents < 50 || cents > 100000)
        ctx.addIssue({ code: "custom", path: ["price"], message: "Vpiši ceno med 0,50 in 1000 €." });
      if (d.payment_instructions.length < 5)
        ctx.addIssue({
          code: "custom",
          path: ["payment_instructions"],
          message: "Napiši, kako naj udeleženci plačajo.",
        });
    }
  });

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function readEvent(fd: FormData) {
  return {
    title: str(fd, "title"),
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    interest_id: str(fd, "interest_id") || undefined,
    schedule: str(fd, "schedule") || "one_off",
    registration_mode: str(fd, "registration_mode") || "native",
    external_url: str(fd, "external_url"),
    is_online: fd.get("is_online") === "on",
    beginner_friendly: fd.get("beginner_friendly") === "on",
    family_friendly: fd.get("family_friendly") === "on",
    city: str(fd, "city"),
    address: str(fd, "address"),
    online_url: str(fd, "online_url"),
    capacity: str(fd, "capacity"),
    max_per_booking: str(fd, "max_per_booking") || "4",
    materials: str(fd, "materials"),
    cancellation_policy: str(fd, "cancellation_policy") || "flexible",
    cover: str(fd, "cover") || "coral",
    payment_mode: str(fd, "payment_mode") || "free",
    price: str(fd, "price"),
    payment_instructions: str(fd, "payment_instructions"),
    payment_deadline_hours: str(fd, "payment_deadline_hours"),
  };
}

function readSessions(fd: FormData): { starts: string; ends: string }[] | string {
  const dates = fd.getAll("session_date").map(String);
  const starts = fd.getAll("session_start").map(String);
  const ends = fd.getAll("session_end").map(String);
  const out: { starts: string; ends: string }[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (!dates[i]) return "Vsak termin potrebuje datum.";
    try {
      const s = ljubljanaToISO(dates[i], starts[i]);
      const e = ljubljanaToISO(dates[i], ends[i]);
      if (Date.parse(e) <= Date.parse(s)) return "Konec termina mora biti po začetku.";
      if (Date.parse(s) < Date.now()) return "Termin ne sme biti v preteklosti.";
      out.push({ starts: s, ends: e });
    } catch {
      return "Neveljaven datum ali ura.";
    }
  }
  if (out.length === 0) return "Dodaj vsaj en termin.";
  if (out.length > 30) return "Največ 30 terminov.";
  return out;
}

export async function createEvent(
  spaceSlug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { space, profile } = await requireSpaceRole(spaceSlug, "admin");
  const raw = readEvent(formData);
  const echo: Record<string, string> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]),
  );
  // Keep the entered sessions on a failed submit (React resets uncontrolled inputs to their defaults).
  const dates = formData.getAll("session_date").map(String);
  const starts = formData.getAll("session_start").map(String);
  const ends = formData.getAll("session_end").map(String);
  echo.nonce = Math.random().toString(36).slice(2);
  echo.sessions_json = JSON.stringify(dates.map((d, i) => ({ d, s: starts[i] ?? "", e: ends[i] ?? "" })));
  const parsed = eventSchema.safeParse(raw);
  const sessions = readSessions(formData);
  const errs = parsed.success ? {} : fieldErrors(parsed.error);
  if (typeof sessions === "string") errs.sessions = sessions;
  if (!parsed.success || typeof sessions === "string") {
    return { errors: errs, values: echo, message: "Preveri označena polja." };
  }
  const d = parsed.data;
  // Paid events need the organizer's legal status (checked again in publish_event); fail before creating a draft.
  if (d.registration_mode === "native" && d.payment_mode === "manual" && !space.legal_form) {
    return {
      values: echo,
      message:
        "Za plačljiv dogodek najprej v Nastavitvah prostora izpolni pravni status organizatorja (podjetje, s.p., društvo, ODD ali zasebnik).",
    };
  }
  const photo = await uploadPhotoFromForm(formData, "photo", profile.id);
  if ("error" in photo)
    return { errors: { photo: photo.error }, values: echo, message: "Preveri označena polja." };
  const slug = `${slugify(d.title).slice(0, 60) || "dogodek"}-${Math.random().toString(36).slice(2, 6)}`;
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      space_id: space.id,
      created_by: profile.id,
      slug,
      title: d.title,
      summary: d.summary || null,
      description: d.description || null,
      interest_id: d.interest_id ?? null,
      schedule: d.schedule,
      booking_scope: d.schedule === "multi_session" ? "series" : "occurrence",
      registration_mode: d.registration_mode,
      external_url: d.registration_mode === "external" ? d.external_url : null,
      is_online: d.is_online,
      beginner_friendly: d.beginner_friendly,
      family_friendly: d.family_friendly,
      city: d.is_online ? null : d.city,
      address: d.is_online ? null : d.address || null,
      online_url: d.is_online && d.online_url ? d.online_url : null,
      capacity: d.capacity ? Number(d.capacity) : null,
      max_per_booking: d.max_per_booking,
      materials: d.materials || null,
      cancellation_policy: d.cancellation_policy,
      cover: d.cover,
      cover_image_path: photo.path,
      ...(d.registration_mode === "native" && d.payment_mode === "manual"
        ? {
            payment_mode: "manual",
            price_cents: priceToCents(d.price),
            payment_instructions: d.payment_instructions,
            payment_deadline_hours: d.payment_deadline_hours ? Number(d.payment_deadline_hours) : null,
          }
        : {
            payment_mode: "free",
            price_cents: null,
            payment_instructions: null,
            payment_deadline_hours: null,
          }),
    })
    .select("id")
    .single();
  if (error || !created) return { message: friendlyDbError(error), values: echo };

  const { error: occError } = await supabase
    .from("event_occurrences")
    .insert(sessions.map((s) => ({ event_id: created.id, starts_at: s.starts, ends_at: s.ends })));
  if (occError) {
    await supabase.from("events").delete().eq("id", created.id);
    return { message: friendlyDbError(occError), values: echo };
  }
  if (formData.get("publish") === "1") {
    const { error: pubError } = await supabase.rpc("publish_event", { p_event: created.id });
    if (pubError) return { message: friendlyDbError(pubError), values: echo };
  }
  revalidatePath(`/organizator/${spaceSlug}/dogodki`);
  revalidatePath("/odkrivanje");
  redirect(`/organizator/${spaceSlug}/dogodki/${created.id}`);
}

export async function publishEvent(spaceSlug: string, eventId: string): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_event", { p_event: eventId });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki`, "layout");
  revalidatePath("/odkrivanje");
  return { ok: true, message: "Dogodek je objavljen in viden v odkrivanju." };
}

export async function cancelEventAction(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event", { p_event: eventId, p_reason: reason.data });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki`, "layout");
  revalidatePath("/odkrivanje");
  return { ok: true, message: "Dogodek je odpovedan. Prijavljeni so prejeli obvestilo." };
}

export async function notifyAttendeesAction(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "staff");
  const message = String(fd.get("message") ?? "").trim();
  if (message.length < 3) return { errors: { message: "Vpiši sporočilo." } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notify_attendees", { p_event: eventId, p_message: message });
  if (error) return { message: friendlyDbError(error) };
  return { ok: true, message: `Obvestilo je poslano (${data ?? 0} prejemnikov).` };
}

export async function deleteDraft(spaceSlug: string, eventId: string): Promise<void> {
  await requireSpaceRole(spaceSlug, "admin");
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId).eq("status", "draft");
  revalidatePath(`/organizator/${spaceSlug}/dogodki`);
  redirect(`/organizator/${spaceSlug}/dogodki`);
}

// ---------------------------------------------------------------------------
// Manual payments (DECISIONS #4): the organizer states receipt; Mekko never marks "paid" itself.
// ---------------------------------------------------------------------------
export async function confirmPaymentAction(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "staff");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_booking_payment", {
    p_booking: String(fd.get("booking_id")),
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  revalidatePath(`/organizator/${spaceSlug}`);
  return { ok: true, message: "Prejem plačila je potrjen." };
}

export async function releaseBookingAction(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "staff");
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_unpaid_booking", {
    p_booking: String(fd.get("booking_id")),
    p_reason: reason.data,
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  return { ok: true, message: "Mesto je sproščeno." };
}

// ---------------------------------------------------------------------------
// Edit after publishing. Sessions, price/payment terms, registration mode and cancellation policy stay as
// published (people booked under them). A changed location notifies everyone who booked.
// ---------------------------------------------------------------------------
const editSchema = z
  .object({
    title: z.string().trim().min(3, "Vsaj 3 znaki.").max(120),
    summary: z.string().trim().max(200, "Največ 200 znakov.").optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    interest_id: z.coerce.number().int().positive().optional(),
    city: z.string().trim().max(80).optional().default(""),
    address: z.string().trim().max(200).optional().default(""),
    online_url: z.string().trim().optional().default(""),
    external_url: z.string().trim().optional().default(""),
    capacity: z.string().trim().optional().default(""),
    max_per_booking: z.coerce.number().int().min(1).max(10),
    materials: z.string().trim().max(1000).optional().default(""),
    cover: z.enum(COVERS),
    beginner_friendly: z.boolean(),
    family_friendly: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (
      d.capacity &&
      !(Number.isInteger(Number(d.capacity)) && Number(d.capacity) >= 1 && Number(d.capacity) <= 10000)
    )
      ctx.addIssue({ code: "custom", path: ["capacity"], message: "Celo število od 1 do 10000 ali prazno." });
    if (d.online_url && !/^https:\/\/\S+$/.test(d.online_url))
      ctx.addIssue({ code: "custom", path: ["online_url"], message: "Povezava mora začeti s https://" });
    if (d.external_url && !/^https:\/\/\S+$/.test(d.external_url))
      ctx.addIssue({ code: "custom", path: ["external_url"], message: "Povezava mora začeti s https://" });
  });

export async function updateEvent(
  spaceSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { profile } = await requireSpaceRole(spaceSlug, "admin");
  const raw = {
    title: str(fd, "title"),
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    interest_id: str(fd, "interest_id") || undefined,
    city: str(fd, "city"),
    address: str(fd, "address"),
    online_url: str(fd, "online_url"),
    external_url: str(fd, "external_url"),
    capacity: str(fd, "capacity"),
    max_per_booking: str(fd, "max_per_booking") || "4",
    materials: str(fd, "materials"),
    cover: str(fd, "cover") || "coral",
    beginner_friendly: fd.get("beginner_friendly") === "on",
    family_friendly: fd.get("family_friendly") === "on",
  };
  const echo: Record<string, string> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]),
  );
  echo.nonce = Math.random().toString(36).slice(2);
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: echo, message: "Preveri označena polja." };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("events")
    .select("id, slug, status, is_online, registration_mode, address, city, cover_image_path")
    .eq("id", eventId)
    .maybeSingle();
  if (!current) return { message: "Dogodka ni bilo mogoče najti." };
  const currentOnlineUrl = current.is_online
    ? ((await supabase.rpc("event_online_url", { p_event: eventId })).data ?? null)
    : null;
  if (current.status === "cancelled") return { message: "Odpovedanega dogodka ni mogoče urejati." };
  if (!current.is_online && !d.city) return { errors: { city: "Vpiši kraj." }, values: echo };

  const photo = await uploadPhotoFromForm(fd, "photo", profile.id);
  if ("error" in photo)
    return { errors: { photo: photo.error }, values: echo, message: "Preveri označena polja." };
  const nextPhoto = photo.path ?? (fd.get("remove_photo") === "on" ? null : current.cover_image_path);

  const { error } = await supabase
    .from("events")
    .update({
      title: d.title,
      summary: d.summary || null,
      description: d.description || null,
      interest_id: d.interest_id ?? null,
      city: current.is_online ? null : d.city,
      address: current.is_online ? null : d.address || null,
      online_url: current.is_online ? d.online_url || null : null,
      external_url: current.registration_mode === "external" ? d.external_url || null : null,
      capacity: d.capacity ? Number(d.capacity) : null,
      max_per_booking: d.max_per_booking,
      materials: d.materials || null,
      cover: d.cover,
      cover_image_path: nextPhoto,
      beginner_friendly: d.beginner_friendly,
      family_friendly: d.family_friendly,
    })
    .eq("id", eventId);
  if (error) return { message: friendlyDbError(error), values: echo };
  await removeOldPhoto(current.cover_image_path, nextPhoto);

  // People who booked must learn about a new place or online link.
  if (current.status === "published") {
    const newPlace = current.is_online
      ? d.online_url || null
      : [d.address || null, d.city].filter(Boolean).join(", ");
    const oldPlace = current.is_online
      ? currentOnlineUrl
      : [current.address, current.city].filter(Boolean).join(", ");
    if ((newPlace ?? "") !== (oldPlace ?? "")) {
      await supabase.rpc("notify_attendees", {
        p_event: eventId,
        p_message: current.is_online
          ? "Povezava do spletne delavnice je spremenjena. Novo povezavo najdeš na strani dogodka."
          : `Lokacija je spremenjena: ${newPlace}.`,
      });
    }
  }
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}`);
  revalidatePath(`/dogodki/${current.slug}`);
  revalidatePath("/odkrivanje");
  redirect(`/organizator/${spaceSlug}/dogodki/${eventId}`);
}

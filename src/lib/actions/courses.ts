"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole, requireUser } from "@/lib/auth/dal";
import { priceToCents } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { parseYouTubeId } from "@/lib/youtube";
import type { FormState } from "@/components/forms";

const errors: Record<string, string> = {
  legal_info_required:
    "Za plačljiv tečaj najprej v Nastavitvah prostora izpolni pravni status organizatorja.",
  course_needs_lessons: "Za objavo dodaj vsaj eno lekcijo z videom.",
  course_not_available: "Ta tečaj ni na voljo.",
  already_enrolled: "Ta tečaj že imaš ali pa nakup čaka na potrditev.",
  rate_limited: "Imaš preveč odprtih naročil. Počakaj na potrditev.",
  enrollment_not_found: "Naročila ni bilo mogoče najti.",
  invalid_status: "Tega trenutno ni mogoče spremeniti.",
  reason_required: "Vpiši razlog.",
  too_many_lessons: "Tečaj ima lahko največ 100 lekcij.",
  not_allowed: "Za to nimaš dovoljenja.",
};
const friendly = (m?: string) => (m && errors[m]) || "Nekaj je šlo narobe. Poskusi znova.";
const uuid = z.uuid();

const courseSchema = z.object({
  title: z.string().trim().min(3, "Vsaj 3 znaki.").max(120),
  summary: z.string().trim().max(200, "Največ 200 znakov.").optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  interest_id: z.coerce.number().int().positive().optional(),
  paid: z.boolean(),
  price: z.string().trim().optional().default(""),
  payment_instructions: z.string().trim().max(1000).optional().default(""),
  payment_link: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Povezava mora začeti s https://"),
});

function readCourse(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    summary: String(fd.get("summary") ?? ""),
    description: String(fd.get("description") ?? ""),
    interest_id: String(fd.get("interest_id") ?? "") || undefined,
    paid: fd.get("paid") === "on",
    price: String(fd.get("price") ?? ""),
    payment_instructions: String(fd.get("payment_instructions") ?? ""),
    payment_link: String(fd.get("payment_link") ?? ""),
  };
}

function validate(raw: ReturnType<typeof readCourse>) {
  const parsed = courseSchema.safeParse(raw);
  const errs: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
  let cents: number | null = null;
  if (raw.paid) {
    cents = priceToCents(raw.price);
    if (cents === null || cents < 50 || cents > 500000) errs.price = "Vpiši ceno med 0,50 in 5000 €.";
    if (raw.payment_instructions.trim().length < 5)
      errs.payment_instructions = "Napiši, kako naj kupci plačajo.";
  }
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]));
  values.nonce = Math.random().toString(36).slice(2);
  return { parsed, errs, cents, values };
}

const fields = (d: z.infer<typeof courseSchema>, cents: number | null) => ({
  title: d.title,
  summary: d.summary || null,
  description: d.description || null,
  interest_id: d.interest_id ?? null,
  price_cents: d.paid ? cents : null,
  payment_instructions: d.paid ? d.payment_instructions : null,
  payment_link: d.paid && d.payment_link ? d.payment_link : null,
});

export async function createCourse(spaceSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { space, profile } = await requireSpaceRole(spaceSlug, "admin");
  const raw = readCourse(fd);
  const { parsed, errs, cents, values } = validate(raw);
  if (!parsed.success || Object.keys(errs).length)
    return { errors: errs, values, message: "Preveri označena polja." };
  if (raw.paid && !space.legal_form) return { message: errors.legal_info_required, values };
  const slug = `${slugify(parsed.data.title).slice(0, 60) || "tecaj"}-${Math.random().toString(36).slice(2, 6)}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ space_id: space.id, slug, created_by: profile.id, ...fields(parsed.data, cents) })
    .select("id")
    .single();
  if (error || !data) return { message: friendly(error?.message), values };
  revalidatePath(`/organizator/${spaceSlug}/tecaji`);
  redirect(`/organizator/${spaceSlug}/tecaji/${data.id}`);
}

export async function updateCourse(
  spaceSlug: string,
  courseId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { space } = await requireSpaceRole(spaceSlug, "admin");
  const raw = readCourse(fd);
  const { parsed, errs, cents, values } = validate(raw);
  if (!parsed.success || Object.keys(errs).length)
    return { errors: errs, values, message: "Preveri označena polja." };
  if (raw.paid && !space.legal_form) return { message: errors.legal_info_required, values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(fields(parsed.data, cents))
    .eq("id", courseId)
    .eq("space_id", space.id)
    .select("slug")
    .single();
  if (error || !data) return { message: friendly(error?.message), values };
  revalidatePath(`/organizator/${spaceSlug}/tecaji`, "layout");
  revalidatePath(`/tecaji/${data.slug}`);
  return { ok: true, message: "Shranjeno.", values };
}

export async function setCourseStatus(
  spaceSlug: string,
  courseId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { space } = await requireSpaceRole(spaceSlug, "admin");
  const status = String(fd.get("status"));
  if (!["draft", "published", "hidden"].includes(status)) return { message: "Neveljavno." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ status: status as "draft" | "published" | "hidden" })
    .eq("id", courseId)
    .eq("space_id", space.id)
    .select("slug")
    .single();
  if (error || !data) return { message: friendly(error?.message) };
  revalidatePath(`/organizator/${spaceSlug}/tecaji`, "layout");
  revalidatePath(`/tecaji/${data.slug}`);
  revalidatePath(`/prostori/${spaceSlug}`);
  return { ok: true, message: status === "published" ? "Tečaj je objavljen." : "Tečaj je skrit." };
}

export async function addLesson(
  spaceSlug: string,
  courseId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const title = String(fd.get("title") ?? "").trim();
  const video = String(fd.get("video") ?? "").trim();
  const notes = String(fd.get("notes") ?? "").trim();
  const values = { title, video, notes, nonce: Math.random().toString(36).slice(2) };
  const errs: Record<string, string> = {};
  if (title.length < 2 || title.length > 120) errs.title = "Naslov lekcije: 2–120 znakov.";
  const id = video ? parseYouTubeId(video) : null;
  if (video && !id) errs.video = "Prilepi povezavo do YouTube videa (npr. https://youtu.be/…).";
  if (notes.length > 5000) errs.notes = "Največ 5000 znakov.";
  if (Object.keys(errs).length) return { errors: errs, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_lesson", {
    p_course: courseId,
    p_title: title,
    p_youtube_id: id ?? "",
    p_notes: notes,
    p_preview: fd.get("is_preview") === "on",
  });
  if (error) return { message: friendly(error.message), values };
  revalidatePath(`/organizator/${spaceSlug}/tecaji/${courseId}`);
  return { ok: true, message: "Lekcija je dodana." };
}

export async function moveLesson(spaceSlug: string, courseId: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "admin");
  const id = String(fd.get("lesson_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("move_lesson", { p_lesson: id, p_up: fd.get("dir") === "up" });
  revalidatePath(`/organizator/${spaceSlug}/tecaji/${courseId}`);
}

export async function removeLesson(
  spaceSlug: string,
  courseId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_lesson", { p_lesson: String(fd.get("lesson_id")) });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}/tecaji/${courseId}`);
  return { ok: true };
}

export async function confirmEnrollment(spaceSlug: string, courseId: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "admin");
  const id = String(fd.get("enrollment_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("confirm_enrollment", { p_enrollment: id });
  revalidatePath(`/organizator/${spaceSlug}`, "layout");
}

export async function cancelEnrollment(
  spaceSlug: string,
  courseId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSpaceRole(spaceSlug, "admin");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!reason) return { errors: { reason: "Vpiši razlog (kupec ga vidi)." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_enrollment", {
    p_enrollment: String(fd.get("enrollment_id")),
    p_reason: reason,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/organizator/${spaceSlug}`, "layout");
  void courseId;
  return { ok: true, message: "Dostop je preklican, kupec je obveščen." };
}

// ---------------------------------------------------------------------------
// Learner
// ---------------------------------------------------------------------------
export async function enrollCourse(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser({ next: `/tecaji/${slug}` });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enroll_course", { p_course: String(fd.get("course_id")) });
  if (error) return { message: friendly(error.message) };
  revalidatePath(`/tecaji/${slug}`);
  revalidatePath("/moj-mekko/tecaji");
  return {
    ok: true,
    message:
      data === "active"
        ? "Tečaj je tvoj. Začni s prvo lekcijo."
        : "Tečaj je naročen. Plačaj po navodilih; organizator ga odklene, ko prejme plačilo.",
  };
}

export async function withdrawEnrollment(fd: FormData): Promise<void> {
  await requireUser();
  const id = String(fd.get("course_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("withdraw_enrollment", { p_course: id });
  const slug = String(fd.get("slug") ?? "");
  revalidatePath(`/tecaji/${slug}`);
  revalidatePath("/moj-mekko/tecaji");
}

export async function setLessonDone(slug: string, fd: FormData): Promise<void> {
  await requireUser();
  const id = String(fd.get("lesson_id"));
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("set_lesson_done", { p_lesson: id, p_done: fd.get("done") === "1" });
  revalidatePath(`/tecaji/${slug}`);
  revalidatePath("/moj-mekko/tecaji");
}

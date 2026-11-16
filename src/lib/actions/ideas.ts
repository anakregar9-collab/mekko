"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole, requireUser } from "@/lib/auth/dal";
import { friendlyDbError } from "@/lib/db/errors";
import { fieldErrors, reasonSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/components/forms";

const COVERS = ["coral", "sun", "sage", "lilac", "sky", "clay"] as const;

const ideaSchema = z.object({
  title: z.string().trim().min(3, "Vsaj 3 znaki.").max(120, "Največ 120 znakov."),
  summary: z.string().trim().max(200, "Največ 200 znakov.").optional().default(""),
  body: z.string().trim().min(20, "Opiši postopek (vsaj 20 znakov).").max(10000, "Največ 10.000 znakov."),
  materials: z.string().trim().max(1000, "Največ 1000 znakov.").optional().default(""),
  time_needed: z.string().trim().max(60, "Največ 60 znakov.").optional().default(""),
  external_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Povezava mora začeti s https://")
    .optional()
    .default(""),
  interest_id: z.coerce.number().int().positive({ error: "Izberi kategorijo." }),
  cover: z.enum(COVERS),
  beginner_friendly: z.boolean(),
  family_friendly: z.boolean(),
});

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createIdea(_prev: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireUser({ next: "/ustvari/ideja" });
  const raw = {
    title: str(fd, "title"),
    summary: str(fd, "summary"),
    body: str(fd, "body"),
    materials: str(fd, "materials"),
    time_needed: str(fd, "time_needed"),
    external_url: str(fd, "external_url"),
    interest_id: str(fd, "interest_id") || "0",
    cover: str(fd, "cover") || "sun",
    beginner_friendly: fd.get("beginner_friendly") === "on",
    family_friendly: fd.get("family_friendly") === "on",
  };
  const echo: Record<string, string> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v)]),
  );
  echo.nonce = Math.random().toString(36).slice(2);
  const parsed = ideaSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: echo, message: "Preveri označena polja." };
  const d = parsed.data;
  const slug = `${slugify(d.title).slice(0, 60) || "ideja"}-${Math.random().toString(36).slice(2, 6)}`;
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").insert({
    author_id: profile.id,
    slug,
    title: d.title,
    summary: d.summary || null,
    body: d.body,
    materials: d.materials || null,
    time_needed: d.time_needed || null,
    external_url: d.external_url || null,
    interest_id: d.interest_id,
    cover: d.cover,
    beginner_friendly: d.beginner_friendly,
    family_friendly: d.family_friendly,
  });
  if (error) return { message: friendlyDbError(error), values: echo };
  revalidatePath("/odkrivanje");
  revalidatePath("/moj-mekko/ideje");
  redirect(`/ideje/${slug}`);
}

export async function deleteIdea(fd: FormData): Promise<void> {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("ideas")
    .delete()
    .eq("id", String(fd.get("idea_id")))
    .eq("author_id", profile.id);
  revalidatePath("/moj-mekko/ideje");
  revalidatePath("/odkrivanje");
  redirect("/moj-mekko/ideje");
}

export async function toggleSaveIdea(fd: FormData): Promise<void> {
  const profile = await requireUser();
  const ideaId = String(fd.get("idea_id"));
  const slug = String(fd.get("slug"));
  const supabase = await createClient();
  if (fd.get("saved") === "1") {
    await supabase.from("saved_ideas").delete().eq("profile_id", profile.id).eq("idea_id", ideaId);
  } else {
    await supabase.from("saved_ideas").insert({ profile_id: profile.id, idea_id: ideaId });
  }
  revalidatePath(`/ideje/${slug}`);
  revalidatePath("/moj-mekko/shranjeno");
}

export async function setIdeaStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin", "moderator"]);
  const status = String(fd.get("status"));
  if (status !== "hidden" && status !== "published") return { message: "Neveljaven status." };
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_idea_status", {
    p_idea: String(fd.get("idea_id")),
    p_status: status,
    p_reason: reason.data,
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath("/admin", "layout");
  revalidatePath("/odkrivanje");
  return { ok: true, message: status === "hidden" ? "Ideja je skrita." : "Ideja je spet vidna." };
}

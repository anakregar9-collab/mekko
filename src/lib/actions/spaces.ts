"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole, requireUser } from "@/lib/auth/dal";
import { friendlyDbError } from "@/lib/db/errors";
import { createSpaceSchema, fieldErrors, inviteSchema, updateSpaceSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createSpace(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser({ next: "/organizator/nov-prostor" });
  const raw = {
    kind: str(formData, "kind"),
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    city: str(formData, "city"),
    tagline: str(formData, "tagline"),
  };
  const parsed = createSpaceSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: raw, message: "Preveri označena polja." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_space", {
    p_kind: d.kind,
    p_name: d.name,
    p_slug: d.slug,
    p_city: d.city || undefined,
    p_tagline: d.tagline || undefined,
  });
  if (error) {
    const msg = friendlyDbError(error);
    return { errors: error.code === "23505" ? { slug: msg } : undefined, message: msg, values: raw };
  }
  revalidatePath("/organizator", "layout");
  redirect(`/organizator/${d.slug}`);
}

export async function updateSpace(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { space } = await requireSpaceRole(slug, "admin");
  const raw = {
    name: str(formData, "name"),
    city: str(formData, "city"),
    tagline: str(formData, "tagline"),
    bio: str(formData, "bio"),
  };
  const parsed = updateSpaceSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: raw, message: "Preveri označena polja." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("spaces")
    .update(
      { name: d.name, city: d.city || null, tagline: d.tagline || null, bio: d.bio || null },
      { count: "exact" },
    )
    .eq("id", space.id);
  if (error || count === 0) return { message: friendlyDbError(error ?? { code: "42501" }), values: raw };
  revalidatePath(`/organizator/${slug}`, "layout");
  return { ok: true, message: "Nastavitve so shranjene." };
}

export async function inviteMember(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { space } = await requireSpaceRole(slug, "admin");
  const raw = { handle: str(formData, "handle").replace(/^@/, ""), role: str(formData, "role") };
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_space_member", {
    p_space: space.id,
    p_handle: parsed.data.handle,
    p_role: parsed.data.role,
  });
  if (error) return { message: friendlyDbError(error), values: raw };
  revalidatePath(`/organizator/${slug}/ekipa`);
  return {
    ok: true,
    message: `Povabilo je poslano osebi @${parsed.data.handle}. Videl/-a ga bo v načinu organizatorja.`,
  };
}

export async function respondInvite(formData: FormData): Promise<void> {
  await requireUser();
  const spaceId = str(formData, "space_id");
  const accept = str(formData, "decision") === "accept";
  const supabase = await createClient();
  await supabase.rpc("respond_space_invite", { p_space: spaceId, p_accept: accept });
  revalidatePath("/organizator", "layout");
  revalidatePath("/moj-mekko");
}

export async function setMemberRole(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { space } = await requireSpaceRole(slug, "owner");
  const role = str(formData, "role");
  if (role !== "admin" && role !== "staff") return { message: "Neveljavna vloga." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_space_member_role", {
    p_space: space.id,
    p_profile: str(formData, "profile_id"),
    p_role: role,
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${slug}/ekipa`);
  return { ok: true, message: "Vloga je spremenjena." };
}

export async function removeMember(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { space } = await requireSpaceRole(slug, "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_space_member", {
    p_space: space.id,
    p_profile: str(formData, "profile_id"),
  });
  if (error) return { message: friendlyDbError(error) };
  revalidatePath(`/organizator/${slug}/ekipa`);
  return { ok: true, message: "Oseba je odstranjena iz ekipe." };
}

export async function leaveSpace(slug: string): Promise<void> {
  const { space, profile } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_space_member", { p_space: space.id, p_profile: profile.id });
  if (error) return;
  revalidatePath("/organizator", "layout");
  redirect("/organizator");
}

const legalSchema = z
  .object({
    legal_form: z.enum(["company", "sole_trader", "association", "institute", "odd", "private"], {
      error: "Izberi status.",
    }),
    ack: z.string().optional().default(""),
    legal_name: z.string().trim().max(120, "Največ 120 znakov.").optional().default(""),
    address: z.string().trim().max(200, "Največ 200 znakov.").optional().default(""),
    registration_number: z.string().trim().max(30, "Največ 30 znakov.").optional().default(""),
    contact_email: z.string().trim().max(120).optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.ack !== "on")
      ctx.addIssue({
        code: "custom",
        path: ["ack"],
        message: "Za shranjevanje potrdi, da razumeš svojo odgovornost.",
      });
    if (d.legal_form === "private") return;
    if (d.legal_name.length < 2)
      ctx.addIssue({ code: "custom", path: ["legal_name"], message: "Vpiši ime ali naziv." });
    if (d.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "Vpiši naslov." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.contact_email))
      ctx.addIssue({ code: "custom", path: ["contact_email"], message: "Vpiši veljaven e-poštni naslov." });
    if ((d.legal_form === "company" || d.legal_form === "sole_trader") && !d.registration_number)
      ctx.addIssue({
        code: "custom",
        path: ["registration_number"],
        message: "Vpiši matično ali davčno številko.",
      });
  });

export async function updateLegalInfo(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { space } = await requireSpaceRole(slug, "admin");
  const raw = {
    legal_form: str(formData, "legal_form"),
    legal_name: str(formData, "legal_name"),
    address: str(formData, "address"),
    registration_number: str(formData, "registration_number"),
    contact_email: str(formData, "contact_email"),
    ack: str(formData, "ack"),
    // Re-mounts the radio group after React's form reset (see event form).
    nonce: Math.random().toString(36).slice(2),
  };
  const parsed = legalSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: raw, message: "Preveri označena polja." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_space_legal_info", {
    p_space: space.id,
    p_form: d.legal_form,
    p_ack: true,
    p_name: d.legal_name,
    p_address: d.address,
    p_registration: d.registration_number,
    p_email: d.contact_email,
  });
  if (error) return { message: friendlyDbError(error), values: raw };
  revalidatePath(`/organizator/${slug}`, "layout");
  revalidatePath(`/prostori/${slug}`);
  return { ok: true, message: "Pravni podatki so shranjeni.", values: raw };
}

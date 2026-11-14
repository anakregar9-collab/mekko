"use server";

import { redirect } from "next/navigation";
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

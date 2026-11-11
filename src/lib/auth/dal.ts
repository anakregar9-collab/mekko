import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

/**
 * Data Access Layer: the ONLY place that resolves "who is the current user".
 * Every function re-verifies on the server; RLS is the second line of defence.
 * All callers render inside <Suspense> (cookies are request data).
 */

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SpaceRole = Database["public"]["Enums"]["space_role"];
export type PlatformRole = Database["public"]["Enums"]["platform_role"];
export type Space = Database["public"]["Tables"]["spaces"]["Row"];

export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const id = await getAuthUserId();
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
});

export async function requireUser(
  opts: { allowUnonboarded?: boolean; next?: string } = {},
): Promise<Profile> {
  const profile = await getMyProfile();
  if (!profile) redirect(`/prijava${opts.next ? `?naprej=${encodeURIComponent(opts.next)}` : ""}`);
  if (profile.status !== "active") redirect("/racun-omejen");
  if (!profile.onboarded_at && !opts.allowUnonboarded) {
    redirect(`/onboarding${opts.next ? `?naprej=${encodeURIComponent(opts.next)}` : ""}`);
  }
  return profile;
}

export const getMyPlatformRoles = cache(async (): Promise<PlatformRole[]> => {
  const id = await getAuthUserId();
  if (!id) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("platform_roles").select("role").eq("profile_id", id);
  return (data ?? []).map((r) => r.role);
});

export async function requirePlatformRole(
  allowed: PlatformRole[],
): Promise<{ profile: Profile; roles: PlatformRole[] }> {
  const profile = await requireUser({ next: "/admin" });
  const roles = await getMyPlatformRoles();
  if (!roles.some((r) => allowed.includes(r))) notFound();
  return { profile, roles };
}

export interface MySpace {
  space: Pick<Space, "id" | "slug" | "name" | "kind" | "city">;
  role: SpaceRole;
  status: Database["public"]["Enums"]["membership_status"];
}

export const getMySpaces = cache(async (): Promise<MySpace[]> => {
  const id = await getAuthUserId();
  if (!id) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("space_members")
    .select("role, status, space:spaces!inner(id, slug, name, kind, city)")
    .eq("profile_id", id)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({ space: r.space, role: r.role, status: r.status }));
});

const rank: Record<SpaceRole, number> = { owner: 4, admin: 3, staff: 2, member: 1 };

export function hasSpaceRole(role: SpaceRole | null | undefined, min: SpaceRole): boolean {
  return role ? rank[role] >= rank[min] : false;
}

/** Resolve a space by slug and require the current user to hold at least `min` in it, else 404. */
export async function requireSpaceRole(
  slug: string,
  min: SpaceRole,
): Promise<{ profile: Profile; space: Space; role: SpaceRole }> {
  const profile = await requireUser({ next: `/organizator/${slug}` });
  const supabase = await createClient();
  const { data: space } = await supabase.from("spaces").select("*").eq("slug", slug).maybeSingle();
  if (!space) notFound();
  const mine = (await getMySpaces()).find((s) => s.space.id === space.id && s.status === "active");
  if (!mine || !hasSpaceRole(mine.role, min)) notFound();
  return { profile, space, role: mine.role };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole, requireUser } from "@/lib/auth/dal";
import { uploadPhotosFromForm } from "@/lib/media-server";
import { reasonSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const errors: Record<string, string> = {
  children_confirmation_required: "Potrdi, da na fotografijah ni prepoznavnih otrok.",
  photos_required: "Dodaj vsaj eno fotografijo (največ 5).",
  rate_limited: "Danes si objavil/-a že veliko. Poskusi znova jutri.",
  invalid_comment: "Komentar naj ima od 1 do 1000 znakov.",
  post_not_found: "Objave ni bilo mogoče najti.",
  cannot_follow_self: "Sebi ne moreš slediti.",
  user_not_found: "Uporabnika ni bilo mogoče najti.",
  cannot_message: "Tej osebi trenutno ne moreš pisati.",
  not_allowed: "Za to nimaš dovoljenja.",
};
const friendly = (m?: string) => (m && errors[m]) || "Nekaj je šlo narobe. Poskusi znova.";
const uuid = z.uuid();

export async function createPost(_prev: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireUser({ next: "/objave/nova" });
  const caption = String(fd.get("caption") ?? "").trim();
  const visibility = fd.get("visibility") === "followers" ? "followers" : "public";
  const values = {
    caption,
    visibility,
    idea: String(fd.get("idea_id") ?? ""),
    event: String(fd.get("event_id") ?? ""),
  };
  const errs: Record<string, string> = {};
  if (caption.length > 2200) errs.caption = "Največ 2200 znakov.";
  if (fd.get("no_children") !== "on") errs.no_children = errors.children_confirmation_required;
  if (fd.getAll("photos").filter((f) => f instanceof File && f.size > 0).length === 0)
    errs.photos = errors.photos_required;
  if (Object.keys(errs).length) return { errors: errs, values, message: "Preveri označena polja." };

  const up = await uploadPhotosFromForm(fd, "photos", profile.id, 5);
  if ("error" in up) return { errors: { photos: up.error }, values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_post", {
    p_caption: caption,
    p_visibility: visibility,
    p_paths: up.paths,
    p_no_children: true,
    p_idea: (uuid.safeParse(values.idea).success ? values.idea : null) as string,
    p_event: (uuid.safeParse(values.event).success ? values.event : null) as string,
  });
  if (error || !data) return { message: friendly(error?.message), values };
  revalidatePath("/feed");
  redirect(`/objave/${data}`);
}

export async function toggleLike(fd: FormData): Promise<void> {
  await requireUser();
  const id = String(fd.get("post_id"));
  const supabase = await createClient();
  await supabase.rpc("toggle_like", { p_post: id });
  const back = String(fd.get("back") ?? "/feed");
  revalidatePath(back.startsWith("/") ? back : "/feed");
}

export async function addComment(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { errors: { body: "Napiši komentar." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_comment", { p_post: postId, p_body: body });
  if (error) return { message: friendly(error.message), values: { body } };
  revalidatePath(`/objave/${postId}`);
  return { ok: true };
}

export async function removeComment(fd: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("remove_comment", { p_comment: Number(fd.get("comment_id")) });
  revalidatePath(`/objave/${String(fd.get("post_id"))}`);
}

export async function removePost(fd: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("remove_post", { p_post: String(fd.get("post_id")) });
  revalidatePath("/feed");
  redirect("/feed");
}

export async function followAction(fd: FormData): Promise<void> {
  await requireUser();
  const target = String(fd.get("profile_id"));
  const handle = String(fd.get("handle"));
  const supabase = await createClient();
  if (fd.get("follow") === "1") await supabase.rpc("follow_user", { p_profile: target });
  else await supabase.rpc("unfollow_user", { p_profile: target });
  revalidatePath(`/u/${handle}`);
  revalidatePath("/feed");
  const back = String(fd.get("back") ?? "");
  if (back.startsWith("/feed/iskanje")) revalidatePath("/feed/iskanje");
}

export async function respondFollowAction(fd: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("respond_follow", {
    p_follower: String(fd.get("follower_id")),
    p_accept: fd.get("accept") === "1",
  });
  revalidatePath("/moj-mekko/sledilci");
  revalidatePath("/feed");
}

/** Share a post into a private message (same messaging rules and limits as any message). */
export async function sharePost(postId: string, toId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("start_conversation", {
    p_to: toId,
    p_body: `Poglej to objavo: /objave/${postId}`,
  });
  if (data) redirect(`/sporocila/${data}`);
  redirect(`/objave/${postId}?deljenje=napaka`);
}

export async function setPostStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  await requirePlatformRole(["super_admin", "admin", "moderator"]);
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { errors: { reason: reason.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_post_status", {
    p_post: String(fd.get("post_id")),
    p_status: "hidden",
    p_reason: reason.data,
  });
  if (error) return { message: friendly(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Objava je skrita." };
}

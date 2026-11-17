import "server-only";
import { createClient } from "@/lib/supabase/server";
import { MAX_PHOTO_BYTES, photoContentType, sniffImageType } from "@/lib/media";

export type UploadResult = { path: string | null } | { error: string };

/**
 * Upload an optional photo from a form field into the user's own folder in "covers".
 * Runs with the signed-in user's session, so storage RLS applies (own folder only).
 */
export async function uploadPhotoFromForm(
  fd: FormData,
  field: string,
  userId: string,
): Promise<UploadResult> {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return { path: null };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Fotografija je prevelika (največ 5 MB)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImageType(bytes);
  if (!ext) return { error: "Dovoljene so samo fotografije JPG, PNG ali WebP." };
  const name = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const path = `${userId}/${name}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, bytes, { contentType: photoContentType[ext], upsert: false, cacheControl: "31536000" });
  if (error) return { error: "Fotografije ni bilo mogoče naložiti. Poskusi znova." };
  return { path };
}

/** Best-effort removal of a replaced photo (own folder only — storage RLS ignores other people's files). */
export async function removeOldPhoto(previous: string | null, next: string | null): Promise<void> {
  if (!previous || previous === next) return;
  const supabase = await createClient();
  await supabase.storage.from("covers").remove([previous]);
}

/** Upload 1..max photos from a multi-file field (same checks as a single photo). */
export async function uploadPhotosFromForm(
  fd: FormData,
  field: string,
  userId: string,
  max: number,
): Promise<{ paths: string[] } | { error: string }> {
  const files = fd.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { paths: [] };
  if (files.length > max) return { error: `Največ ${max} fotografij.` };
  const paths: string[] = [];
  for (const file of files) {
    const one = new FormData();
    one.set("f", file);
    const res = await uploadPhotoFromForm(one, "f", userId);
    if ("error" in res) return res;
    if (res.path) paths.push(res.path);
  }
  return { paths };
}

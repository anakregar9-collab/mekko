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

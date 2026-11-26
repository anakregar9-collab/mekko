/** Photos (bucket "covers"): public URLs and file-signature checks shared by server actions. */

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export type PhotoExt = "jpg" | "png" | "webp";

/** Detect JPEG/PNG/WebP from the first bytes — never trust the browser-provided type or file name. */
export function sniffImageType(bytes: Uint8Array): PhotoExt | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b))
    return "png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}

export const photoContentType: Record<PhotoExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Public URL of a stored photo, or null for the colour placeholder. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/covers/${path}`;
}

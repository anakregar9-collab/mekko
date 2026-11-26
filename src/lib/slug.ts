const map: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "d", ß: "ss" };

/** URL slug for spaces: lowercase ASCII, hyphens, 2–50 chars; matches the DB check constraint. */
export function slugify(input: string): string {
  const s = input
    .toLocaleLowerCase("sl")
    .replace(/[čćšžđß]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return s;
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;
export const HANDLE_RE = /^[a-z0-9][a-z0-9_.]{2,29}$/;

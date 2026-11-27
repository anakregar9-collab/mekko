import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover: string;
  priceCents: number | null;
  space: { name: string; slug: string } | null;
}

function cleanQuery(q: string | undefined): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 60);
}

/** Published courses of live spaces (RLS), newest first. Search covers everything (no personalization). */
export async function listCourses(
  opts: { q?: string; interestId?: number; limit?: number } = {},
): Promise<CourseCardData[]> {
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("id, slug, title, summary, cover, price_cents, space:spaces(name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 60);
  const q = cleanQuery(opts.q);
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  if (opts.interestId) query = query.eq("interest_id", opts.interestId);
  const { data } = await query;
  return (
    (data ?? []) as unknown as {
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      cover: string;
      price_cents: number | null;
      space: { name: string; slug: string } | null;
    }[]
  ).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    cover: c.cover,
    priceCents: c.price_cents,
    space: c.space,
  }));
}

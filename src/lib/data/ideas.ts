import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CoverTone } from "@/lib/data/events";
import { coverUrl } from "@/lib/media";

export interface IdeaCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  timeNeeded: string | null;
  cover: CoverTone;
  coverImageUrl: string | null;
  beginner: boolean;
  family: boolean;
  isDemo: boolean;
  author: string | null;
  likeCount: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface IdeaStats {
  likeCount: number;
  commentCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  likedByMe: boolean;
  myRating: number | null;
}

export async function ideaStats(ids: string[]): Promise<Map<string, IdeaStats>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc("idea_stats", { p_ideas: ids });
  return new Map(
    (data ?? []).map((r) => [
      r.idea_id,
      {
        likeCount: r.like_count,
        commentCount: r.comment_count,
        ratingAvg: r.rating_avg === null ? null : Number(r.rating_avg),
        ratingCount: r.rating_count,
        likedByMe: r.liked_by_me,
        myRating: r.my_rating,
      },
    ]),
  );
}

/** Columns guests may read (instructions, materials and link need sign-in). */
export const IDEA_PREVIEW_COLUMNS =
  "id, author_id, slug, title, summary, time_needed, interest_id, cover, beginner_friendly, family_friendly, status, is_demo, published_at, cover_image_path";

function cleanQuery(q: string | undefined): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 60);
}

/** Published ideas, newest first. Search covers everything (no personalization filter). */
export async function listIdeas(
  opts: { q?: string; interestId?: number; beginner?: boolean; family?: boolean; limit?: number } = {},
): Promise<IdeaCardData[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ideas")
    .select(IDEA_PREVIEW_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 60);
  const q = cleanQuery(opts.q);
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  if (opts.interestId) query = query.eq("interest_id", opts.interestId);
  if (opts.beginner) query = query.eq("beginner_friendly", true);
  if (opts.family) query = query.eq("family_friendly", true);
  const { data } = await query;
  const rows = data ?? [];
  const [authors, stats] = await Promise.all([
    ideaAuthors(rows.map((r) => r.id)),
    ideaStats(rows.map((r) => r.id)),
  ]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    timeNeeded: r.time_needed,
    cover: r.cover as CoverTone,
    coverImageUrl: coverUrl(r.cover_image_path),
    beginner: r.beginner_friendly,
    family: r.family_friendly,
    isDemo: r.is_demo,
    author: authors.get(r.id)?.display_name ?? null,
    likeCount: stats.get(r.id)?.likeCount ?? 0,
    ratingAvg: stats.get(r.id)?.ratingAvg ?? null,
    ratingCount: stats.get(r.id)?.ratingCount ?? 0,
  }));
}

export async function ideaAuthors(ids: string[]) {
  if (ids.length === 0) return new Map<string, { display_name: string; handle: string }>();
  const supabase = await createClient();
  const { data } = await supabase.rpc("idea_authors", { p_ideas: ids });
  return new Map((data ?? []).map((a) => [a.idea_id, { display_name: a.display_name, handle: a.handle }]));
}

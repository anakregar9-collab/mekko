import "server-only";
import { createClient } from "@/lib/supabase/server";
import { coverUrl } from "@/lib/media";

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  caption: string | null;
  visibility: "public" | "followers";
  idea: { slug: string; title: string } | null;
  event: { slug: string; title: string } | null;
  createdAt: string;
  photos: string[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  status: string;
}

type Row = {
  id: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  caption: string | null;
  visibility: string;
  idea_slug: string | null;
  idea_title: string | null;
  event_slug: string | null;
  event_title: string | null;
  created_at: string;
  photos: string[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  status: string;
};

function map(r: Row): FeedPost {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorHandle: r.author_handle,
    caption: r.caption,
    visibility: r.visibility as FeedPost["visibility"],
    idea: r.idea_slug && r.idea_title ? { slug: r.idea_slug, title: r.idea_title } : null,
    event: r.event_slug && r.event_title ? { slug: r.event_slug, title: r.event_title } : null,
    createdAt: r.created_at,
    photos: (r.photos ?? []).map((p) => coverUrl(p)).filter((u): u is string => !!u),
    likeCount: r.like_count,
    commentCount: r.comment_count,
    likedByMe: r.liked_by_me,
    status: r.status,
  };
}

/** Visibility is enforced inside the RPC (public / followers-only / blocks / private profiles). */
export async function listFeed(scope: "following" | "all", before?: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("feed_posts", {
    p_scope: scope,
    p_before: before as string,
    p_limit: 20,
  });
  return ((data ?? []) as Row[]).map(map);
}

export async function listAuthorPosts(authorId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("feed_posts", { p_scope: "author", p_author: authorId, p_limit: 50 });
  return ((data ?? []) as Row[]).map(map);
}

export async function getPost(id: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("feed_posts", { p_scope: "single", p_author: id, p_limit: 1 });
  const row = ((data ?? []) as Row[])[0];
  return row ? map(row) : null;
}

export async function getComments(postId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("post_comments_for", { p_post: postId });
  return data ?? [];
}

export async function getFeedProfile(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("feed_profile", { p_handle: handle });
  return data?.[0] ?? null;
}

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { addIdeaComment, rateIdea, removeIdeaComment, toggleIdeaLike } from "@/lib/actions/ideas";
import { createClient } from "@/lib/supabase/server";
import type { IdeaStats } from "@/lib/data/ideas";
import { CommentForm } from "@/components/feed/comment-form";
import { ReportForm } from "@/components/messages/forms";
import { SubmitButton } from "@/components/forms";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const avg = (n: number | null) => (n === null ? "–" : n.toFixed(1).replace(".", ","));

/** Summary for guests: counts and average only. */
export function IdeaStatsSummary({ stats }: { stats: IdeaStats | undefined }) {
  if (!stats) return null;
  return (
    <p className="flex flex-wrap items-center gap-4 text-sm" data-testid="idea-stats">
      <span className="flex items-center gap-1 font-semibold">
        <Star aria-hidden="true" className="size-4 fill-sun text-sun" /> {avg(stats.ratingAvg)}
        <span className="font-normal text-ink-muted">({stats.ratingCount} ocen)</span>
      </span>
      <span className="flex items-center gap-1">
        <Heart aria-hidden="true" className="size-4" /> {stats.likeCount}
        <span className="sr-only">všečkov</span>
      </span>
      <span>{stats.commentCount} komentarjev</span>
    </p>
  );
}

/** Signed-in view: like, rate, comment (author cannot rate own idea). */
export async function IdeaEngagement({
  idea,
  stats,
  me,
}: {
  idea: { id: string; slug: string; authorId: string };
  stats: IdeaStats | undefined;
  me: string;
}) {
  const supabase = await createClient();
  const { data: comments } = await supabase.rpc("idea_comments_for", { p_idea: idea.id });
  const mine = idea.authorId === me;
  const s = stats ?? {
    likeCount: 0,
    commentCount: 0,
    ratingAvg: null,
    ratingCount: 0,
    likedByMe: false,
    myRating: null,
  };

  return (
    <section className="space-y-4" aria-label="Odzivi">
      <div className="flex flex-wrap items-center gap-3">
        <form action={toggleIdeaLike}>
          <input type="hidden" name="idea_id" value={idea.id} />
          <input type="hidden" name="slug" value={idea.slug} />
          <button
            type="submit"
            aria-pressed={s.likedByMe}
            className="flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold ring-1 ring-line"
          >
            <Heart aria-hidden="true" className={cn("size-5", s.likedByMe && "fill-brand text-brand")} />
            {s.likeCount}
            <span className="sr-only">{s.likedByMe ? "Odstrani všeček" : "Všečkaj idejo"}</span>
          </button>
        </form>
        <p className="flex items-center gap-1 text-sm" data-testid="idea-rating">
          <Star aria-hidden="true" className="size-5 fill-sun text-sun" />
          <span className="font-semibold">{avg(s.ratingAvg)}</span>
          <span className="text-ink-muted">({s.ratingCount} ocen)</span>
        </p>
      </div>

      {!mine && (
        <form action={rateIdea} className="space-y-1">
          <input type="hidden" name="idea_id" value={idea.id} />
          <input type="hidden" name="slug" value={idea.slug} />
          <p className="text-sm font-semibold" id={`rate-${idea.id}`}>
            {s.myRating ? `Tvoja ocena: ${s.myRating}/5 (lahko jo spremeniš)` : "Oceni idejo"}
          </p>
          <div className="flex gap-1" role="group" aria-labelledby={`rate-${idea.id}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="submit"
                name="stars"
                value={n}
                aria-pressed={s.myRating === n}
                className="flex size-11 items-center justify-center rounded-full hover:bg-sun-soft"
              >
                <Star
                  aria-hidden="true"
                  className={cn("size-7", (s.myRating ?? 0) >= n ? "fill-sun text-sun" : "text-ink-muted")}
                />
                <span className="sr-only">
                  {n} {n === 1 ? "zvezdica" : n === 2 ? "zvezdici" : n <= 4 ? "zvezdice" : "zvezdic"}
                </span>
              </button>
            ))}
          </div>
        </form>
      )}

      <div className="space-y-3" id="komentarji">
        <h2 className="font-display text-lg font-bold">Komentarji in vprašanja</h2>
        {(comments ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Še ni komentarjev. Vprašaj avtorja, če ti kaj ni jasno.</p>
        ) : (
          <ul className="space-y-2" data-testid="idea-comments">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <p className="text-sm">
                  <Link href={`/u/${c.author_handle}`} className="font-semibold hover:underline">
                    {c.author_name}
                  </Link>{" "}
                  {c.author_id === idea.authorId && (
                    <span className="text-xs font-semibold text-brand-strong">avtor</span>
                  )}{" "}
                  <span className="text-xs text-ink-muted">
                    {formatDate(c.created_at)} {formatTime(c.created_at)}
                  </span>
                </p>
                <p
                  className={c.removed ? "text-sm text-ink-muted italic" : "break-words whitespace-pre-line"}
                >
                  {c.removed ? "Komentar je odstranjen." : c.body}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {c.can_remove && (
                    <form action={removeIdeaComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="slug" value={idea.slug} />
                      <SubmitButton variant="ghost" size="sm" pendingText="…">
                        Odstrani
                      </SubmitButton>
                    </form>
                  )}
                  {!c.removed && c.author_id !== me && (
                    <ReportForm targetType="idea_comment" targetId={String(c.id)} label="Prijavi komentar" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <CommentForm
          action={addIdeaComment.bind(null, idea.id, idea.slug)}
          label="Napiši komentar ali vprašanje"
        />
      </div>
    </section>
  );
}

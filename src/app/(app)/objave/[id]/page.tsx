import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getComments, getPost } from "@/lib/data/feed";
import { removeComment, removePost } from "@/lib/actions/feed";
import { PostCard } from "@/components/feed/post-card";
import { CommentForm } from "@/components/feed/comment-form";
import { ReportForm } from "@/components/messages/forms";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Objava" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Page({ params, searchParams }: PageProps<"/objave/[id]">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackLink href="/feed">Feed</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/objave/[id]">["params"];
  searchParams: PageProps<"/objave/[id]">["searchParams"];
}) {
  const { id } = await params;
  const me = await requireUser({ next: `/objave/${id}` });
  if (!UUID.test(id)) notFound();
  const [post, comments, sp] = await Promise.all([getPost(id), getComments(id), searchParams]);
  if (!post) notFound();
  const mine = post.authorId === me.id;

  return (
    <div className="space-y-4">
      {sp.deljenje === "napaka" && (
        <p role="alert" className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
          Tej osebi trenutno ne moreš poslati sporočila.
        </p>
      )}
      {post.status === "hidden" && mine && (
        <p role="status" className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
          Moderatorji so to objavo skrili, zato je drugi ne vidijo.
        </p>
      )}
      <PostCard post={post} back={`/objave/${post.id}`} linkToPost={false} />

      <section id="komentarji" className="space-y-3" aria-labelledby="komentarji-naslov">
        <h2 id="komentarji-naslov" className="font-display text-lg font-bold">
          Komentarji
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-ink-muted">Še ni komentarjev.</p>
        ) : (
          <ul className="space-y-2" data-testid="comments">
            {comments.map((c) => (
              <li key={c.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <p className="text-sm">
                  <Link href={`/u/${c.author_handle}`} className="font-semibold hover:underline">
                    {c.author_name}
                  </Link>{" "}
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
                    <form action={removeComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="…">
                        Odstrani
                      </SubmitButton>
                    </form>
                  )}
                  {!c.removed && c.author_id !== me.id && (
                    <ReportForm targetType="comment" targetId={String(c.id)} label="Prijavi komentar" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {post.status === "published" && <CommentForm postId={post.id} />}
      </section>

      {mine ? (
        <form action={removePost}>
          <input type="hidden" name="post_id" value={post.id} />
          <SubmitButton variant="ghost" pendingText="Odstranjujem …">
            Izbriši objavo
          </SubmitButton>
        </form>
      ) : (
        <ReportForm targetType="post" targetId={post.id} label="Prijavi objavo" />
      )}
    </div>
  );
}

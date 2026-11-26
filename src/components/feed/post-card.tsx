import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Heart, Lightbulb, MessageCircle, Send, Users } from "lucide-react";
import { toggleLike } from "@/lib/actions/feed";
import type { FeedPost } from "@/lib/data/feed";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function PostCard({
  post,
  back,
  linkToPost = true,
}: {
  post: FeedPost;
  back: string;
  linkToPost?: boolean;
}) {
  return (
    <article
      className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="post"
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href={`/u/${post.authorHandle}`} className="min-w-0 font-semibold hover:underline">
          <span className="block truncate">{post.authorName}</span>
          <span className="block text-xs font-normal text-ink-muted">@{post.authorHandle}</span>
        </Link>
        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-muted">
          {post.visibility === "followers" && (
            <span className="flex items-center gap-1" title="Samo za sledilce">
              <Users aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Samo za sledilce ·</span>
            </span>
          )}
          {formatDate(post.createdAt)}
        </span>
      </header>
      <div
        className="scroll-row flex snap-x snap-mandatory overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
        role="region"
        tabIndex={0}
        aria-label={`Fotografije (${post.photos.length})`}
      >
        {post.photos.map((src, i) => (
          <div key={src} className="relative aspect-square w-full shrink-0 snap-center bg-cream">
            <Image
              src={src}
              alt={`Fotografija ${i + 1} od ${post.photos.length}, objava ${post.authorName}`}
              fill
              unoptimized
              sizes="(min-width: 768px) 600px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {post.photos.length > 1 && (
        <p className="px-4 pt-2 text-xs text-ink-muted">{post.photos.length} fotografije · podrsaj vstran</p>
      )}
      <div className="flex items-center gap-1 px-2 pt-1">
        <form action={toggleLike}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="back" value={back} />
          <button
            type="submit"
            aria-pressed={post.likedByMe}
            className="flex min-h-11 items-center gap-1 rounded-full px-2 font-semibold"
          >
            <Heart aria-hidden="true" className={cn("size-6", post.likedByMe && "fill-brand text-brand")} />
            <span>{post.likeCount}</span>
            <span className="sr-only">{post.likedByMe ? "Odstrani všeček" : "Všečkaj"}</span>
          </button>
        </form>
        <Link
          href={`/objave/${post.id}#komentarji`}
          className="flex min-h-11 items-center gap-1 rounded-full px-2 font-semibold"
        >
          <MessageCircle aria-hidden="true" className="size-6" /> {post.commentCount}
          <span className="sr-only">komentarjev</span>
        </Link>
        <Link
          href={`/objave/${post.id}/deli`}
          className="flex min-h-11 items-center gap-1 rounded-full px-2 font-semibold"
        >
          <Send aria-hidden="true" className="size-6" />
          <span className="sr-only">Pošlji kolegu</span>
        </Link>
      </div>
      <div className="space-y-2 px-4 pb-4">
        {post.caption && <p className="break-words whitespace-pre-line">{post.caption}</p>}
        {(post.idea || post.event) && (
          <p className="flex flex-wrap gap-2 text-sm">
            {post.idea && (
              <Link
                href={`/ideje/${post.idea.slug}`}
                className="inline-flex items-center gap-1 font-semibold text-brand-strong underline"
              >
                <Lightbulb aria-hidden="true" className="size-4" /> {post.idea.title}
              </Link>
            )}
            {post.event && (
              <Link
                href={`/dogodki/${post.event.slug}`}
                className="inline-flex items-center gap-1 font-semibold text-brand-strong underline"
              >
                <CalendarDays aria-hidden="true" className="size-4" /> {post.event.title}
              </Link>
            )}
          </p>
        )}
        {linkToPost && post.commentCount > 0 && (
          <Link
            href={`/objave/${post.id}#komentarji`}
            className="block text-sm text-ink-muted hover:underline"
          >
            Poglej komentarje ({post.commentCount})
          </Link>
        )}
      </div>
    </article>
  );
}

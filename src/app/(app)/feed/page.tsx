import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { listFeed } from "@/lib/data/feed";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Feed" };

export default function Page({ searchParams }: PageProps<"/feed">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Feed</h1>
        <div className="flex items-center gap-1">
          <Link href="/feed/iskanje" className={buttonClasses("ghost", "sm")}>
            <Search aria-hidden="true" className="size-4" /> Poišči ljudi
          </Link>
          <Link href="/objave/nova" className={buttonClasses("primary", "sm")}>
            <Plus aria-hidden="true" className="size-4" /> Nova objava
          </Link>
        </div>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/feed">["searchParams"] }) {
  const me = await requireUser({ next: "/feed" });
  const sp = await searchParams;
  const scope = sp.pogled === "navdih" ? "all" : "following";
  const before = typeof sp.pred === "string" && !Number.isNaN(Date.parse(sp.pred)) ? sp.pred : undefined;
  const supabase = await createClient();
  const [posts, { count: pending }] = await Promise.all([
    listFeed(scope, before),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", me.id)
      .eq("status", "pending"),
  ]);

  return (
    <div className="space-y-4">
      <nav
        aria-label="Vrsta feeda"
        className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1 ring-1 ring-line"
      >
        {(
          [
            ["following", "Sledim", "/feed"],
            ["all", "Navdih", "/feed?pogled=navdih"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={scope === key ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-full font-semibold",
              scope === key ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {!!pending && (
        <Link
          href="/moj-mekko/sledilci"
          className="flex items-center gap-2 rounded-2xl bg-lilac-soft p-3 font-semibold text-lilac-ink"
          data-testid="follow-requests"
        >
          <UserPlus aria-hidden="true" className="size-5" /> Prošnje za sledenje: {pending}
        </Link>
      )}

      {posts.length === 0 ? (
        <EmptyState title={scope === "following" ? "Tukaj bodo objave ljudi, ki jim slediš" : "Še ni objav"}>
          <p>
            {scope === "following" ? (
              <>
                Poišči ljudi v{" "}
                <Link href="/feed?pogled=navdih" className="font-semibold text-brand-strong underline">
                  Navdihu
                </Link>{" "}
                ali{" "}
                <Link href="/objave/nova" className="font-semibold text-brand-strong underline">
                  deli svoj izdelek
                </Link>
                .
              </>
            ) : (
              <Link href="/objave/nova" className="font-semibold text-brand-strong underline">
                Bodi prvi/-a, ki deli svoj izdelek
              </Link>
            )}
          </p>
        </EmptyState>
      ) : (
        <>
          {before && (
            <Link
              href={scope === "all" ? "/feed?pogled=navdih" : "/feed"}
              className="text-sm font-semibold text-brand-strong underline"
            >
              ← Na najnovejše objave
            </Link>
          )}
          <ul className="space-y-4" data-testid="feed-posts">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} back={scope === "all" ? "/feed?pogled=navdih" : "/feed"} />
              </li>
            ))}
          </ul>
          {posts.length === 20 && (
            <Link
              href={`/feed?${scope === "all" ? "pogled=navdih&" : ""}pred=${encodeURIComponent(posts[posts.length - 1].createdAt)}`}
              className={buttonClasses("secondary", "md", "w-full")}
            >
              Naloži starejše objave
            </Link>
          )}
        </>
      )}
    </div>
  );
}

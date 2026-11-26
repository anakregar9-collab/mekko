import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { CoverTone } from "@/lib/data/events";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Moje ideje" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Moje ideje</h1>
        <Link href="/ustvari/ideja" className={buttonClasses("primary", "sm")}>
          <Plus aria-hidden="true" className="size-4" /> Nova ideja
        </Link>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/ideje" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("ideas")
    .select("id, slug, title, summary, cover, status, published_at")
    .eq("author_id", profile.id)
    .order("published_at", { ascending: false });
  const list = data ?? [];
  if (list.length === 0) {
    return (
      <EmptyState title="Še nisi objavil/-a nobene ideje">
        <p>Ideje so brezplačna navodila ali navdih, ki se prikažejo v Odkrivanju pod »Ideje«.</p>
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="my-ideas">
      {list.map((i) => (
        <li key={i.id}>
          <Link
            href={`/ideje/${i.slug}`}
            className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <Cover tone={i.cover as CoverTone} className="size-16 shrink-0 rounded-2xl" />
            <span className="min-w-0 space-y-1">
              <span className="block font-semibold break-words">{i.title}</span>
              <span className="block text-sm text-ink-muted">Objavljeno {formatDate(i.published_at)}</span>
              {i.status === "hidden" && <Badge tone="brand">Skrita</Badge>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

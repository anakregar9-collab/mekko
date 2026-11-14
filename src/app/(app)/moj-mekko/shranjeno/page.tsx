import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Cover } from "@/components/ui/cover";
import type { CoverTone } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Shranjeno" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Shranjeno</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/shranjeno" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_events")
    .select("event:events(slug, title, summary, cover, city)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  const events = (data ?? []).map((r) => r.event).filter((e): e is NonNullable<typeof e> => Boolean(e));
  if (events.length === 0) {
    return (
      <EmptyState title="Še nič shranjenega">
        <p>
          Na strani dogodka klikni »Shrani«.{" "}
          <Link href="/odkrivanje" className="font-semibold text-brand-strong underline">
            Na odkrivanje
          </Link>
        </p>
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="saved-list">
      {events.map((e) => (
        <li key={e.slug}>
          <Link
            href={`/dogodki/${e.slug}`}
            className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <Cover tone={e.cover as CoverTone} className="size-16 shrink-0 rounded-2xl" />
            <span className="min-w-0">
              <span className="block font-semibold">{e.title}</span>
              <span className="block text-sm text-ink-muted">{e.summary ?? e.city}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

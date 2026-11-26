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
  const [{ data }, { data: savedIdeas }] = await Promise.all([
    supabase
      .from("saved_events")
      .select("event:events(slug, title, summary, cover, city)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_ideas")
      .select("idea:ideas(slug, title, summary, cover)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);
  const events = (data ?? []).map((r) => r.event).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const ideas = (savedIdeas ?? []).map((r) => r.idea).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const items = [
    ...events.map((e) => ({
      key: `e-${e.slug}`,
      href: `/dogodki/${e.slug}`,
      title: e.title,
      sub: e.summary ?? e.city,
      cover: e.cover,
      kind: "Dogodek",
    })),
    ...ideas.map((i) => ({
      key: `i-${i.slug}`,
      href: `/ideje/${i.slug}`,
      title: i.title,
      sub: i.summary,
      cover: i.cover,
      kind: "Ideja",
    })),
  ];
  if (items.length === 0) {
    return (
      <EmptyState title="Še nič shranjenega">
        <p>
          Na strani dogodka ali ideje klikni »Shrani«.{" "}
          <Link href="/odkrivanje" className="font-semibold text-brand-strong underline">
            Na odkrivanje
          </Link>
        </p>
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="saved-list">
      {items.map((e) => (
        <li key={e.key}>
          <Link
            href={e.href}
            className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <Cover tone={e.cover as CoverTone} className="size-16 shrink-0 rounded-2xl" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-ink-muted uppercase">{e.kind}</span>
              <span className="block font-semibold">{e.title}</span>
              <span className="block text-sm text-ink-muted">{e.sub}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

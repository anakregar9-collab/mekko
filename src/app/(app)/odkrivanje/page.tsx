import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { listInterestsForFilter, listUpcomingEvents } from "@/lib/data/events";
import { LiveEventCard } from "@/components/events/event-card";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Odkrivanje" };

export default function OdkrivanjePage({ searchParams }: PageProps<"/odkrivanje">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Odkrivanje</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<"/odkrivanje">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const cat = typeof sp.kategorija === "string" ? sp.kategorija : "";
  const interests = await listInterestsForFilter();
  const interest = interests.find((i) => i.slug === cat);
  const events = await listUpcomingEvents({ q, interestId: interest?.id });

  const chipHref = (slug: string | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (slug) p.set("kategorija", slug);
    const s = p.toString();
    return `/odkrivanje${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <form role="search" action="/odkrivanje" className="relative">
        {interest && <input type="hidden" name="kategorija" value={interest.slug} />}
        <label htmlFor="q" className="sr-only">
          Išči dogodke
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Išči delavnice, kraje …"
          className="min-h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base placeholder:text-ink-muted"
        />
      </form>

      <nav
        aria-label="Kategorije"
        className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        <Chip href={chipHref(null)} active={!interest}>
          Vse
        </Chip>
        {interests.map((i) => (
          <Chip key={i.id} href={chipHref(i.slug)} active={interest?.id === i.id}>
            {i.label_sl}
          </Chip>
        ))}
      </nav>

      {events.length === 0 ? (
        <EmptyState title={q || interest ? "Ni zadetkov" : "Kmalu novi dogodki"}>
          {q || interest ? (
            <Link href="/odkrivanje" className="font-semibold text-brand-strong underline">
              Počisti iskanje
            </Link>
          ) : (
            <p>
              Organizatorji pripravljajo prve delavnice.{" "}
              <Link href="/ustvari" className="font-semibold text-brand-strong underline">
                Objavi svojo
              </Link>
            </p>
          )}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="feed">
          {events.map((e) => (
            <li key={e.id}>
              <LiveEventCard event={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1",
        active ? "bg-brand text-white ring-brand" : "bg-surface text-ink ring-line hover:bg-brand-soft",
      )}
    >
      {children}
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check, Lightbulb, Search } from "lucide-react";
import {
  listInterestsForFilter,
  listUpcomingEvents,
  QUICK_FILTERS,
  type QuickFilter,
} from "@/lib/data/events";
import { LiveEventCard } from "@/components/events/event-card";
import { LiveIdeaCard } from "@/components/ideas/idea-card";
import { listIdeas } from "@/lib/data/ideas";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Odkrivanje" };

type Tab = "dogodki" | "ideje";

/** Cards per "Pokaži več" step; the URL keeps the total (?vec=48) so the view can be shared and reloaded. */
const PAGE = 24;
const MAX_SHOWN = 192;

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

function readQuick(v: string | string[] | undefined): QuickFilter[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  const allowed = new Set(QUICK_FILTERS.map((f) => f.key));
  return [...new Set(list.filter((x): x is QuickFilter => allowed.has(x as QuickFilter)))];
}

async function Feed({ searchParams }: { searchParams: PageProps<"/odkrivanje">["searchParams"] }) {
  const sp = await searchParams;
  const tab: Tab = sp.pogled === "ideje" ? "ideje" : "dogodki";
  const q = typeof sp.q === "string" ? sp.q : "";
  const cat = typeof sp.kategorija === "string" ? sp.kategorija : "";
  const quick = readQuick(sp.f);
  const vecRaw = Number(typeof sp.vec === "string" ? sp.vec : PAGE);
  const shown = Number.isInteger(vecRaw)
    ? Math.min(Math.max(Math.ceil(vecRaw / PAGE) * PAGE, PAGE), MAX_SHOWN)
    : PAGE;
  const interests = await listInterestsForFilter();
  const interest = interests.find((i) => i.slug === cat);

  /** Same search, categories and quick filters on both tabs; each link changes one thing. */
  const href = (change: { tab?: Tab; kategorija?: string | null; toggle?: QuickFilter; vec?: number }) => {
    const p = new URLSearchParams();
    const t = change.tab ?? tab;
    if (t === "ideje") p.set("pogled", "ideje");
    if (q) p.set("q", q);
    const k = change.kategorija === undefined ? interest?.slug : change.kategorija;
    if (k) p.set("kategorija", k);
    const nextQuick = change.toggle
      ? quick.includes(change.toggle)
        ? quick.filter((f) => f !== change.toggle)
        : [...quick, change.toggle]
      : quick;
    for (const f of nextQuick) p.append("f", f);
    if (change.vec) p.set("vec", String(change.vec));
    const s = p.toString();
    return `/odkrivanje${s ? `?${s}` : ""}`;
  };

  const filtered = !!(q || interest || quick.length);
  const eventsPlus =
    tab === "dogodki"
      ? await listUpcomingEvents({ q, interestId: interest?.id, quick, limit: shown + 1 })
      : [];
  // Ideas use the filters that make sense for them ("Online" / "Ta vikend" are event-only and kept in the URL).
  const ideasPlus =
    tab === "ideje"
      ? await listIdeas({
          q,
          interestId: interest?.id,
          beginner: quick.includes("zacetniki"),
          family: quick.includes("otroci"),
          limit: shown + 1,
        })
      : [];
  const events = eventsPlus.slice(0, shown);
  const ideas = ideasPlus.slice(0, shown);
  const hasMore = (tab === "dogodki" ? eventsPlus.length : ideasPlus.length) > shown && shown < MAX_SHOWN;
  const more = hasMore ? (
    <div className="flex justify-center pt-2">
      <Link
        href={href({ vec: shown + PAGE })}
        scroll={false}
        className="inline-flex min-h-11 items-center rounded-full bg-surface px-6 font-semibold ring-1 ring-line hover:bg-brand-soft"
        data-testid="show-more"
      >
        Pokaži več
      </Link>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <nav
        aria-label="Vrsta vsebine"
        className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1 ring-1 ring-line"
      >
        {(["dogodki", "ideje"] as const).map((t) => (
          <Link
            key={t}
            href={href({ tab: t })}
            aria-current={tab === t ? "page" : undefined}
            data-testid={`tab-${t}`}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-full font-semibold",
              tab === t ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            )}
          >
            {t === "dogodki" ? "Dogodki" : "Ideje"}
          </Link>
        ))}
      </nav>

      <form role="search" action="/odkrivanje" className="relative">
        {tab === "ideje" && <input type="hidden" name="pogled" value="ideje" />}
        {interest && <input type="hidden" name="kategorija" value={interest.slug} />}
        {quick.map((f) => (
          <input key={f} type="hidden" name="f" value={f} />
        ))}
        <label htmlFor="q" className="sr-only">
          {tab === "dogodki" ? "Išči dogodke" : "Išči ideje"}
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
          placeholder={tab === "dogodki" ? "Išči delavnice, kraje …" : "Išči ideje in navodila …"}
          className="min-h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base placeholder:text-ink-muted"
        />
      </form>

      <nav
        aria-label="Hitri filtri"
        className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        {QUICK_FILTERS.filter((f) => tab === "dogodki" || f.key === "zacetniki" || f.key === "otroci").map(
          (f) => {
            const on = quick.includes(f.key);
            return (
              <Link
                key={f.key}
                href={href({ toggle: f.key })}
                aria-pressed={on}
                role="button"
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1",
                  on ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:bg-brand-soft",
                )}
              >
                {on && <Check aria-hidden="true" className="size-4" />}
                {f.label}
              </Link>
            );
          },
        )}
      </nav>

      <nav
        aria-label="Kategorije"
        className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        <Chip href={href({ kategorija: null })} active={!interest}>
          Vse
        </Chip>
        {interests.map((i) => (
          <Chip key={i.id} href={href({ kategorija: i.slug })} active={interest?.id === i.id}>
            {i.label_sl}
          </Chip>
        ))}
      </nav>

      {tab === "ideje" ? (
        ideas.length === 0 ? (
          <div data-testid="ideas-empty">
            <EmptyState title={filtered ? "Ni zadetkov" : "Še ni idej"}>
              {filtered ? (
                <Link href="/odkrivanje?pogled=ideje" className="font-semibold text-brand-strong underline">
                  Počisti iskanje in filtre
                </Link>
              ) : (
                <p className="flex items-start justify-center gap-2">
                  <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                  <span>
                    Deli navodila ali navdih za ustvarjanje doma.{" "}
                    <Link href="/ustvari/ideja" className="font-semibold text-brand-strong underline">
                      Objavi prvo idejo
                    </Link>
                  </span>
                </p>
              )}
            </EmptyState>
          </div>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2" data-testid="ideas-feed">
              {ideas.map((i) => (
                <li key={i.id}>
                  <LiveIdeaCard idea={i} />
                </li>
              ))}
            </ul>
            {more}
          </>
        )
      ) : events.length === 0 ? (
        <EmptyState title={filtered ? "Ni zadetkov" : "Kmalu novi dogodki"}>
          {filtered ? (
            <Link href="/odkrivanje" className="font-semibold text-brand-strong underline">
              Počisti iskanje in filtre
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
        <>
          <ul className="grid gap-4 sm:grid-cols-2" data-testid="feed">
            {events.map((e) => (
              <li key={e.id}>
                <LiveEventCard event={e} />
              </li>
            ))}
          </ul>
          {more}
        </>
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

"use client";

import { useState } from "react";
import { PrototypeAction } from "@/components/prototype-action";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import type { Category, Idea, MekkoEvent, Space } from "@/lib/domain/types";
import { EventCard } from "@/components/visitor/event-card";
import { IdeaCard } from "@/components/visitor/idea-card";
import { cn } from "@/lib/cn";

type Kind = "vse" | "dogodki" | "ideje";

/**
 * Discovery feed. Personalization only re-orders; search and category chips
 * always browse everything (CLAUDE.md: personalization must not suppress search).
 */
export function DiscoveryFeed({
  events,
  ideas,
  spaces,
  categories,
}: {
  events: MekkoEvent[];
  ideas: Idea[];
  spaces: Space[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("vse");

  const q = query.trim().toLocaleLowerCase("sl");
  const match = (text: string) => !q || text.toLocaleLowerCase("sl").includes(q);

  const filteredEvents =
    kind === "ideje"
      ? []
      : events.filter(
          (e) => (!category || e.categorySlug === category) && match(`${e.title} ${e.summary} ${e.city}`),
        );
  const filteredIdeas =
    kind === "dogodki"
      ? []
      : ideas.filter((i) => (!category || i.categorySlug === category) && match(`${i.title} ${i.summary}`));

  // Events are the core conversion: interleave one idea after every two events.
  const items: Array<{ type: "event"; e: MekkoEvent } | { type: "idea"; i: Idea }> = [];
  let ii = 0;
  filteredEvents.forEach((e, idx) => {
    items.push({ type: "event", e });
    if (idx % 2 === 1 && ii < filteredIdeas.length) items.push({ type: "idea", i: filteredIdeas[ii++] });
  });
  while (ii < filteredIdeas.length) items.push({ type: "idea", i: filteredIdeas[ii++] });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Odkrivanje</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          <MapPin aria-hidden="true" className="size-4" />
          <span>Blizu: Ljubljana · tvoja zanimanja: keramika, ročna dela</span>
          <PrototypeAction asLink explanation="urejanje zanimanj in lokacije pride v M1 (onboarding).">
            Spremeni
          </PrototypeAction>
        </p>
      </div>

      <div role="search" className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Išči dogodke in ideje</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Išči delavnice, ideje, kraje …"
            className="min-h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base placeholder:text-ink-muted"
          />
        </label>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Vrsta vsebine"
            className="flex shrink-0 rounded-full bg-surface p-1 ring-1 ring-line"
          >
            {(["vse", "dogodki", "ideje"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "min-h-9 rounded-full px-3 text-sm font-semibold capitalize",
                  kind === k ? "bg-ink text-cream" : "text-ink-muted",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <SlidersHorizontal aria-hidden="true" className="ml-auto hidden size-5 text-ink-muted sm:block" />
        </div>

        <div
          role="group"
          aria-label="Kategorije"
          className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          <Chip active={category === null} onClick={() => setCategory(null)}>
            Vse kategorije
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              active={category === c.slug}
              onClick={() => setCategory(c.slug === category ? null : c.slug)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {items.length} rezultatov
      </p>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface p-8 text-center ring-1 ring-line">
          <p className="font-display text-xl font-bold">Ni zadetkov</p>
          <p className="mt-1 text-ink-muted">Poskusi z drugo besedo ali počisti filtre.</p>
          <button
            type="button"
            className="mt-4 font-semibold text-brand-strong underline"
            onClick={() => {
              setQuery("");
              setCategory(null);
              setKind("vse");
            }}
          >
            Počisti filtre
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="feed">
          {items.map((it) =>
            it.type === "event" ? (
              <li key={it.e.id}>
                <EventCard event={it.e} space={spaces.find((s) => s.id === it.e.spaceId)} />
              </li>
            ) : (
              <li key={it.i.id}>
                <IdeaCard idea={it.i} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1",
        active ? "bg-brand text-white ring-brand" : "bg-surface text-ink ring-line hover:bg-brand-soft",
      )}
    >
      {children}
    </button>
  );
}

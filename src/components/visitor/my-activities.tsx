"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AgendaItem } from "@/lib/calendar";
import { groupByDay, monthGrid } from "@/lib/calendar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Cover } from "@/components/ui/cover";
import { formatSlot, localDateKey } from "@/lib/format";
import { cn } from "@/lib/cn";

const statusLabel: Record<AgendaItem["status"], { label: string; tone: Tone }> = {
  confirmed: { label: "Potrjeno", tone: "sage" },
  pending_payment: { label: "Čaka plačilo", tone: "sun" },
  waitlisted: { label: "Čakalna vrsta", tone: "lilac" },
  cancelled_by_user: { label: "Odpovedano", tone: "neutral" },
  cancelled_by_organizer: { label: "Odpovedal organizator", tone: "brand" },
};

const monthNames = [
  "januar",
  "februar",
  "marec",
  "april",
  "maj",
  "junij",
  "julij",
  "avgust",
  "september",
  "oktober",
  "november",
  "december",
];
const weekdays = ["Po", "To", "Sr", "Če", "Pe", "So", "Ne"];

export function MyActivities({ items, today }: { items: AgendaItem[]; today: string }) {
  const [view, setView] = useState<"seznam" | "koledar">("seznam");
  const [when, setWhen] = useState<"prihajajoce" | "pretekle">("prihajajoce");
  const todayKey = localDateKey(today);
  const [ym, setYm] = useState(() => ({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) }));

  const now = Date.parse(today);
  const upcoming = items.filter((i) => Date.parse(i.endsAt) >= now);
  const past = items.filter((i) => Date.parse(i.endsAt) < now).reverse();
  const list = when === "prihajajoce" ? upcoming : past;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moje aktivnosti</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Obdobje"
          value={when}
          onChange={setWhen}
          options={[
            { v: "prihajajoce", l: `Prihajajoče (${upcoming.length})` },
            { v: "pretekle", l: "Pretekle" },
          ]}
        />
        <Segmented
          label="Pogled"
          value={view}
          onChange={setView}
          options={[
            { v: "seznam", l: "Seznam" },
            { v: "koledar", l: "Koledar" },
          ]}
        />
      </div>

      {view === "seznam" ? (
        list.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-surface p-8 text-center ring-1 ring-line">
            <p className="font-display text-xl font-bold">
              {when === "pretekle" ? "Še ni preteklih aktivnosti" : "Nimaš prihajajočih aktivnosti"}
            </p>
            <Link
              href="/prototip/odkrivanje"
              className="mt-3 inline-block font-semibold text-brand-strong underline"
            >
              Odkrij dogodke
            </Link>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="activities-list">
            {list.map((it) => (
              <li key={`${it.bookingId}-${it.occurrenceId}`}>
                <Link
                  href={`/prototip/dogodki/${it.event.slug}`}
                  className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)]"
                >
                  <Cover tone={it.event.cover} className="size-16 shrink-0 rounded-2xl" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold leading-snug">
                      {it.event.title}
                      {it.sessionNumber && (
                        <span className="font-normal text-ink-muted"> · srečanje {it.sessionNumber}</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-muted">{formatSlot(it.startsAt, it.endsAt)}</p>
                    <Badge tone={statusLabel[it.status].tone}>{statusLabel[it.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <CalendarView items={items} ym={ym} setYm={setYm} todayKey={todayKey} />
      )}

      <p className="text-sm text-ink-muted">
        Dogodki z zunanjo prijavo se tu ne prikažejo, ker rezervacija ne poteka prek Mekka.
      </p>
    </div>
  );
}

function CalendarView({
  items,
  ym,
  setYm,
  todayKey,
}: {
  items: AgendaItem[];
  ym: { y: number; m: number };
  setYm: (v: { y: number; m: number }) => void;
  todayKey: string;
}) {
  const byDay = groupByDay(items);
  const cells = monthGrid(ym.y, ym.m);
  const [selected, setSelected] = useState<string | null>(null);
  const shift = (d: number) => {
    const m0 = ym.m - 1 + d;
    setYm({ y: ym.y + Math.floor(m0 / 12), m: (((m0 % 12) + 12) % 12) + 1 });
    setSelected(null);
  };
  const selectedItems = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="space-y-3" data-testid="activities-calendar">
      <div className="rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Prejšnji mesec"
            className="flex size-11 items-center justify-center rounded-full hover:bg-brand-soft"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <h2 className="font-display text-lg font-bold capitalize" aria-live="polite">
            {monthNames[ym.m - 1]} {ym.y}
          </h2>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Naslednji mesec"
            className="flex size-11 items-center justify-center rounded-full hover:bg-brand-soft"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-muted" aria-hidden="true">
          {weekdays.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`pad-${i}`} />;
            const has = byDay.get(key);
            const day = Number(key.slice(8));
            return (
              <button
                key={key}
                type="button"
                disabled={!has}
                aria-pressed={selected === key}
                aria-label={`${day}. ${monthNames[ym.m - 1]}${has ? `, ${has.length} aktivnost` : ""}`}
                onClick={() => setSelected(key)}
                className={cn(
                  "relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-xl text-sm disabled:cursor-default",
                  key === todayKey && "ring-2 ring-ink",
                  has && "bg-brand-soft font-bold text-brand-strong",
                  selected === key && "bg-brand text-white",
                )}
              >
                {day}
                {has && (
                  <span
                    aria-hidden="true"
                    className={cn("mt-0.5 size-1.5 rounded-full", selected === key ? "bg-white" : "bg-brand")}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {selected && (
        <ul className="space-y-2">
          {selectedItems.map((it) => (
            <li key={it.occurrenceId} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
              <p className="font-semibold">{it.event.title}</p>
              <p className="text-sm text-ink-muted">{formatSlot(it.startsAt, it.endsAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-surface p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "min-h-9 rounded-full px-3 text-sm font-semibold",
            value === o.v ? "bg-ink text-cream" : "text-ink-muted",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatTime, localDateKey, monthRange, pluralSl } from "@/lib/format";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Koledar" };

export default function Page(props: PageProps<"/organizator/[space]/koledar">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Koledar</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

interface Row {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "cancelled";
  event: {
    id: string;
    title: string;
    status: string;
    capacity: number | null;
    booking_scope: "series" | "occurrence";
    registration_mode: "native" | "external";
  };
}

const dayFmt = new Intl.DateTimeFormat("sl-SI", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Ljubljana",
});

async function Content({ params, searchParams }: PageProps<"/organizator/[space]/koledar">) {
  const { space: slug } = await params;
  const sp = await searchParams;
  const { space } = await requireSpaceRole(slug, "staff");
  const now = nowMs();
  const month = monthRange(typeof sp.mesec === "string" ? sp.mesec : undefined, new Date(now).toISOString());
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_occurrences")
    .select(
      "id, starts_at, ends_at, status, event:events!inner(id, title, status, capacity, booking_scope, registration_mode, space_id)",
    )
    .eq("event.space_id", space.id)
    .neq("event.status", "draft")
    .gte("starts_at", month.startIso)
    .lt("starts_at", month.endIso)
    .order("starts_at")
    .limit(500);
  const rows = (data ?? []) as unknown as Row[];
  const eventIds = [...new Set(rows.map((r) => r.event.id))];
  const { data: bookings } = eventIds.length
    ? await supabase
        .from("bookings")
        .select("event_id, occurrence_id, quantity")
        .in("event_id", eventIds)
        .eq("status", "confirmed")
    : { data: [] as { event_id: string; occurrence_id: string | null; quantity: number }[] };
  const taken = (r: Row) =>
    (bookings ?? [])
      .filter(
        (b) =>
          b.event_id === r.event.id &&
          (r.event.booking_scope === "series" ? b.occurrence_id === null : b.occurrence_id === r.id),
      )
      .reduce((n, b) => n + b.quantity, 0);

  const days = new Map<string, Row[]>();
  for (const r of rows) {
    const k = localDateKey(r.starts_at);
    days.set(k, [...(days.get(k) ?? []), r]);
  }
  const totalSessions = rows.filter((r) => r.status === "scheduled").length;

  return (
    <div className="space-y-4">
      <nav aria-label="Izbira meseca" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Link
          href={`/organizator/${slug}/koledar?mesec=${month.prev}`}
          className={buttonClasses("ghost", "sm")}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">Prejšnji</span>
          <span className="sr-only"> mesec</span>
        </Link>
        <p className="text-center font-display text-lg font-bold first-letter:uppercase" aria-live="polite">
          {month.label}
          <span className="block text-sm font-normal text-ink-muted normal-case">
            {totalSessions} {pluralSl(totalSessions, ["termin", "termina", "termini", "terminov"])}
          </span>
        </p>
        <Link
          href={`/organizator/${slug}/koledar?mesec=${month.next}`}
          className={buttonClasses("ghost", "sm")}
        >
          <span className="sr-only sm:not-sr-only">Naslednji</span>
          <span className="sr-only"> mesec</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="Ta mesec ni terminov">
          <p>
            <Link href={`/organizator/${slug}/dogodki/nov`} className="font-semibold underline">
              Ustvari dogodek
            </Link>{" "}
            ali poglej drug mesec.
          </p>
        </EmptyState>
      ) : (
        <ol className="space-y-4" data-testid="calendar">
          {[...days.entries()].map(([day, list]) => (
            <li key={day} className="space-y-2">
              <h2 className="font-semibold first-letter:uppercase">
                {dayFmt.format(new Date(list[0].starts_at))}
              </h2>
              <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
                {list.map((r) => {
                  const t = taken(r);
                  const attendanceOpen =
                    r.status === "scheduled" &&
                    r.event.registration_mode === "native" &&
                    Date.parse(r.starts_at) - now <= 12 * 3_600_000;
                  return (
                    <li key={r.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-4">
                      <span className="w-28 shrink-0 font-semibold tabular-nums">
                        {formatTime(r.starts_at)}–{formatTime(r.ends_at)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/organizator/${slug}/dogodki/${r.event.id}`}
                          className={`font-semibold break-words underline-offset-2 hover:underline ${r.status === "cancelled" ? "text-ink-muted line-through" : ""}`}
                        >
                          {r.event.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                          {r.status === "cancelled" && <Badge tone="brand">Odpovedan</Badge>}
                          {r.event.status === "cancelled" && <Badge tone="brand">Dogodek odpovedan</Badge>}
                          {r.event.registration_mode === "native" ? (
                            <span className="tabular-nums">
                              {t}
                              {r.event.capacity ? ` / ${r.event.capacity}` : ""} prijavljenih
                              {r.event.booking_scope === "series" ? " (cel tečaj)" : ""}
                            </span>
                          ) : (
                            <span>Zunanja prijava</span>
                          )}
                        </div>
                      </div>
                      {attendanceOpen && (
                        <Link
                          href={`/organizator/${slug}/dogodki/${r.event.id}/prisotnost/${r.id}`}
                          className="text-sm font-semibold text-brand-strong underline"
                        >
                          Prisotnost
                          <span className="sr-only">: {r.event.title}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

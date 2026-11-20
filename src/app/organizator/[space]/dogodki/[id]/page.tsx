import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice, formatSlot, formatTime, pluralSl } from "@/lib/format";
import { SessionsPanel } from "./sessions-panel";
import { nowMs } from "@/lib/time";
import {
  CancelEventForm,
  DeleteDraftButton,
  NotifyForm,
  PaymentActions,
  PublishButton,
} from "./manage-forms";

export const metadata: Metadata = { title: "Upravljanje dogodka" };

export default function Page({ params }: PageProps<"/organizator/[space]/dogodki/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

interface AttendeeRow {
  id: string;
  occurrence_id: string | null;
  quantity: number;
  note: string | null;
  status: string;
  created_at: string;
  booker_id: string;
  payment_state: "none" | "awaiting" | "organizer_confirmed";
  amount_cents: number | null;
  payment_due_at: string | null;
  booker: { display_name: string; handle: string } | null;
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/dogodki/[id]">["params"] }) {
  const { space: slug, id } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, status, capacity, schedule, booking_scope, registration_mode, cancel_reason")
    .eq("id", id)
    .eq("space_id", space.id)
    .maybeSingle();
  if (!event) notFound();
  const [{ data: occ }, { data: bookingsRaw }] = await Promise.all([
    supabase
      .from("event_occurrences")
      .select("id, starts_at, ends_at, status")
      .eq("event_id", id)
      .order("starts_at"),
    supabase
      .from("bookings")
      .select(
        "id, booker_id, occurrence_id, quantity, note, status, payment_state, amount_cents, payment_due_at, created_at, booker:profiles!bookings_booker_id_fkey(display_name, handle)",
      )
      .eq("event_id", id)
      .order("created_at"),
  ]);
  const occurrences = occ ?? [];
  const bookings = (bookingsRaw ?? []) as unknown as AttendeeRow[];
  const active = bookings.filter((b) => b.status === "confirmed");
  const isAdmin = hasSpaceRole(role, "admin");
  const now = nowMs();
  const local = (iso: string) => {
    const d = new Date(iso);
    const fmt = (o: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Ljubljana", ...o }).format(d);
    return {
      date: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }),
      time: fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    };
  };
  const sessions = occurrences.map((o) => ({
    id: o.id,
    label: formatSlot(o.starts_at, o.ends_at),
    date: local(o.starts_at).date,
    start: local(o.starts_at).time,
    end: local(o.ends_at).time,
    cancelled: o.status === "cancelled",
    editable: o.status === "scheduled" && Date.parse(o.starts_at) > now,
  }));
  const attendanceSessions = occurrences.filter(
    (o) => o.status === "scheduled" && Date.parse(o.starts_at) - now <= 12 * 3_600_000,
  );
  const groups =
    event.booking_scope === "series"
      ? [{ key: "series", label: "Cel tečaj", list: active }]
      : occurrences.map((o) => ({
          key: o.id,
          label: formatSlot(o.starts_at, o.ends_at),
          list: active.filter((b) => b.occurrence_id === o.id),
        }));

  return (
    <div className="space-y-5">
      <BackLink href={`/organizator/${slug}/dogodki`}>Dogodki</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge
            tone={event.status === "published" ? "sage" : event.status === "cancelled" ? "brand" : "neutral"}
          >
            {event.status === "published"
              ? "Objavljeno"
              : event.status === "cancelled"
                ? "Odpovedano"
                : "Osnutek"}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight break-words">
            {event.title}
          </h1>
        </div>
        {event.status !== "draft" && (
          <Link
            href={`/dogodki/${event.slug}`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-strong underline"
          >
            Javna stran <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        )}
        {isAdmin && event.status !== "cancelled" && (
          <Link
            href={`/organizator/${slug}/dogodki/${event.id}/uredi`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-strong underline"
          >
            Uredi dogodek
          </Link>
        )}
      </div>

      {event.status === "draft" && isAdmin && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-sun-soft p-4 text-sun-ink sm:flex-row sm:items-center">
          <p className="flex-1">Osnutek ni viden obiskovalcem.</p>
          <div className="flex gap-2">
            <PublishButton spaceSlug={slug} eventId={event.id} />
            <DeleteDraftButton spaceSlug={slug} eventId={event.id} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={`Udeleženci (${active.reduce((n, b) => n + b.quantity, 0)})`}>
          {event.registration_mode === "external" ? (
            <p className="text-ink-muted">Prijave potekajo na tvoji zunanji strani.</p>
          ) : (
            <div className="space-y-5" data-testid="attendees">
              {groups.map((g) => {
                const taken = g.list.reduce((n, b) => n + b.quantity, 0);
                return (
                  <section key={g.key} className="space-y-2">
                    <h3 className="flex flex-wrap justify-between gap-2 font-semibold">
                      <span>{g.label}</span>
                      <span className="text-sm font-normal text-ink-muted tabular-nums">
                        {taken} {pluralSl(taken, ["oseba", "osebi", "osebe", "oseb"])}
                        {event.capacity
                          ? ` od ${event.capacity} ${pluralSl(event.capacity, ["mesta", "mest", "mest", "mest"])}`
                          : ""}
                      </span>
                    </h3>
                    {g.list.length === 0 ? (
                      <p className="text-sm text-ink-muted">Še ni prijav.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {g.list.map((b) => (
                          <li key={b.id} className="py-2">
                            <p className="flex justify-between gap-2">
                              <span className="font-medium">
                                {b.booker?.display_name ?? "Uporabnik"}{" "}
                                <span className="text-sm text-ink-muted">@{b.booker?.handle}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-3">
                                <Link
                                  href={`/sporocila/nov?komu=${b.booker_id}`}
                                  className="text-sm font-semibold text-brand-strong underline"
                                >
                                  Piši
                                  <span className="sr-only">
                                    {" "}
                                    osebi {b.booker?.display_name ?? "Uporabnik"}
                                  </span>
                                </Link>
                                <span className="tabular-nums">× {b.quantity}</span>
                              </span>
                            </p>
                            {b.note && <p className="text-sm text-ink-muted">„{b.note}“</p>}
                            {b.payment_state === "awaiting" && (
                              <>
                                <p className="mt-1 text-sm">
                                  <Badge tone="sun">Čaka plačilo</Badge>{" "}
                                  <span className="tabular-nums">{formatPrice(b.amount_cents ?? 0)}</span>
                                  {b.payment_due_at && (
                                    <span className="text-ink-muted">
                                      {" "}
                                      · rok {formatDate(b.payment_due_at)} {formatTime(b.payment_due_at)}
                                    </span>
                                  )}
                                </p>
                                {event.status === "published" && (
                                  <PaymentActions
                                    spaceSlug={slug}
                                    eventId={event.id}
                                    bookingId={b.id}
                                    name={b.booker?.display_name ?? "Uporabnik"}
                                  />
                                )}
                              </>
                            )}
                            {b.payment_state === "organizer_confirmed" && (
                              <p className="mt-1 text-sm">
                                <Badge tone="sage">Plačilo potrjeno</Badge>{" "}
                                <span className="tabular-nums">{formatPrice(b.amount_cents ?? 0)}</span>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          {event.registration_mode === "native" && event.status !== "draft" && (
            <Panel title="Prisotnost in izvoz">
              <div className="space-y-3">
                {attendanceSessions.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    Prisotnost lahko beležiš od 12 ur pred začetkom termina.
                  </p>
                ) : (
                  <ul className="space-y-1" data-testid="attendance-links">
                    {attendanceSessions
                      .slice()
                      .reverse()
                      .slice(0, 8)
                      .map((o) => (
                        <li key={o.id}>
                          <Link
                            href={`/organizator/${slug}/dogodki/${event.id}/prisotnost/${o.id}`}
                            className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline"
                          >
                            Prisotnost: {formatSlot(o.starts_at, o.ends_at)}
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
                <a
                  href={`/organizator/${slug}/dogodki/${event.id}/udelezenci.csv`}
                  className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline"
                  download
                >
                  Prenesi seznam udeležencev (CSV)
                </a>
              </div>
            </Panel>
          )}
          {isAdmin && event.status !== "cancelled" && (
            <Panel title="Termini">
              <SessionsPanel spaceSlug={slug} eventId={event.id} sessions={sessions} />
            </Panel>
          )}
          {event.status === "published" && active.length > 0 && (
            <Panel title="Obvesti udeležence">
              <NotifyForm spaceSlug={slug} eventId={event.id} />
            </Panel>
          )}
          {event.status === "published" && isAdmin && (
            <Panel title="Odpoved dogodka">
              <CancelEventForm spaceSlug={slug} eventId={event.id} />
            </Panel>
          )}
          {event.status === "cancelled" && (
            <Panel title="Odpovedano">
              <p className="text-ink-muted">{event.cancel_reason}</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

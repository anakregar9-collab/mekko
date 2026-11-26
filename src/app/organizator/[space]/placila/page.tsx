import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { formatAmount, formatDate, formatTime, localDateKey } from "@/lib/format";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Plačila" };

export default function Page({ params }: PageProps<"/organizator/[space]/placila">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Plačila</h1>
      <p className="max-w-2xl text-sm text-ink-muted">
        Pregled ročnih plačil (nakazilo, gotovina …), ki jih udeleženci plačajo neposredno tebi. Mekko plačil
        ne obdeluje; zneski so iz prijav, ki si jih potrdil/-a ali še čakajo.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

interface BookingRow {
  id: string;
  event_id: string;
  quantity: number;
  payment_state: "none" | "awaiting" | "organizer_confirmed";
  amount_cents: number | null;
  payment_due_at: string | null;
  payment_confirmed_at: string | null;
  booker: { display_name: string; handle: string } | null;
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/placila">["params"] }) {
  const { space: slug } = await params;
  const { space } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("space_id", space.id)
    .eq("payment_mode", "manual")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  const list = events ?? [];
  const { data: passRows } = await supabase
    .from("passes")
    .select("price_cents, status, confirmed_at")
    .eq("space_id", space.id)
    .neq("status", "cancelled");
  const { data: courseRows } = await supabase
    .from("courses")
    .select("id")
    .eq("space_id", space.id)
    .not("price_cents", "is", null);
  const courseIds = (courseRows ?? []).map((c) => c.id);
  const { data: enrRows } = courseIds.length
    ? await supabase
        .from("course_enrollments")
        .select("price_cents, status, confirmed_at")
        .in("course_id", courseIds)
        .neq("status", "cancelled")
    : { data: [] as { price_cents: number | null; status: string; confirmed_at: string | null }[] };
  // Course sales count like pass sales (same manual-confirmation model).
  const passes = [
    ...(passRows ?? []),
    ...(enrRows ?? []).map((e) => ({
      price_cents: e.price_cents ?? 0,
      status: e.status,
      confirmed_at: e.confirmed_at,
    })),
  ];
  if (list.length === 0 && passes.length === 0) {
    return (
      <EmptyState title="Še ni plačljivih dogodkov">
        <p>Ko objaviš dogodek z ročnim plačilom, se tu prikažejo potrjena in čakajoča plačila.</p>
      </EmptyState>
    );
  }
  const { data: raw } = list.length
    ? await supabase
        .from("bookings")
        .select(
          "id, event_id, quantity, payment_state, amount_cents, payment_due_at, payment_confirmed_at, booker:profiles!bookings_booker_id_fkey(display_name, handle)",
        )
        .in(
          "event_id",
          list.map((e) => e.id),
        )
        .eq("status", "confirmed")
        .neq("payment_state", "none")
    : { data: [] };
  const bookings = (raw ?? []) as unknown as BookingRow[];
  const now = nowMs();
  const thisMonth = localDateKey(new Date(now).toISOString()).slice(0, 7);
  const sum = (rows: BookingRow[]) => rows.reduce((n, b) => n + (b.amount_cents ?? 0), 0);
  const confirmed = bookings.filter((b) => b.payment_state === "organizer_confirmed");
  const awaiting = bookings
    .filter((b) => b.payment_state === "awaiting")
    .sort((a, b) => (a.payment_due_at ?? "9").localeCompare(b.payment_due_at ?? "9"));
  const overdue = awaiting.filter((b) => b.payment_due_at && Date.parse(b.payment_due_at) < now);
  const confirmedThisMonth = confirmed.filter(
    (b) => b.payment_confirmed_at && localDateKey(b.payment_confirmed_at).slice(0, 7) === thisMonth,
  );
  const passConfirmed = passes.filter((p) => p.status === "active");
  const passAwaiting = passes.filter((p) => p.status === "awaiting");
  const passSum = (rows: typeof passes) => rows.reduce((n, p) => n + p.price_cents, 0);
  const passThisMonth = passConfirmed.filter(
    (p) => p.confirmed_at && localDateKey(p.confirmed_at).slice(0, 7) === thisMonth,
  );
  const title = (id: string) => list.find((e) => e.id === id)?.title ?? "Dogodek";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="payment-stats">
        <StatTile
          label="Potrjeno skupaj"
          value={formatAmount(sum(confirmed) + passSum(passConfirmed))}
          hint={`${confirmed.length} prijav, ${passConfirmed.length} kart/tečajev`}
        />
        <StatTile
          label="Potrjeno ta mesec"
          value={formatAmount(sum(confirmedThisMonth) + passSum(passThisMonth))}
          hint={`${confirmedThisMonth.length} prijav, ${passThisMonth.length} kart/tečajev`}
        />
        <StatTile
          label="Čaka plačilo"
          value={formatAmount(sum(awaiting) + passSum(passAwaiting))}
          hint={`${awaiting.length} prijav, ${passAwaiting.length} kart/tečajev`}
        />
        <StatTile label="Po roku" value={String(overdue.length)} hint="Čakajoče prijave s pretečenim rokom" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Čakajoča plačila">
          {awaiting.length === 0 ? (
            <p className="text-sm text-ink-muted">Ni čakajočih plačil.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="awaiting-payments">
              {awaiting.map((b) => {
                const late = b.payment_due_at && Date.parse(b.payment_due_at) < now;
                return (
                  <li key={b.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">{b.booker?.display_name ?? "Uporabnik"}</p>
                      <Link
                        href={`/organizator/${slug}/dogodki/${b.event_id}`}
                        className="text-sm break-words text-brand-strong underline"
                      >
                        {title(b.event_id)}
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold tabular-nums">{formatAmount(b.amount_cents ?? 0)}</span>
                      {b.payment_due_at ? (
                        <Badge tone={late ? "brand" : "sun"}>
                          {late ? "Po roku" : "Rok"} {formatDate(b.payment_due_at)}{" "}
                          {formatTime(b.payment_due_at)}
                        </Badge>
                      ) : (
                        <Badge tone="sun">Brez roka</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {awaiting.length > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Plačilo potrdiš ali rezervacijo sprostiš na strani posameznega dogodka.
            </p>
          )}
        </Panel>

        <Panel title="Po dogodkih">
          <ul className="divide-y divide-line" data-testid="payments-by-event">
            {list.map((e) => {
              const mine = bookings.filter((b) => b.event_id === e.id);
              return (
                <li key={e.id} className="py-3">
                  <Link
                    href={`/organizator/${slug}/dogodki/${e.id}`}
                    className="font-semibold break-words underline-offset-2 hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-sm text-ink-muted tabular-nums">
                    Potrjeno{" "}
                    {formatAmount(sum(mine.filter((b) => b.payment_state === "organizer_confirmed")))} · čaka{" "}
                    {formatAmount(sum(mine.filter((b) => b.payment_state === "awaiting")))}
                    {e.status === "cancelled" ? " · odpovedan" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

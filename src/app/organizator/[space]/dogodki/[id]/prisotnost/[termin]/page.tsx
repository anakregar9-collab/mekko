import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { buttonClasses } from "@/components/ui/button";
import { formatSlot, pluralSl } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { setAttendance } from "@/lib/actions/studio";

export const metadata: Metadata = { title: "Prisotnost" };

const ATTENDANCE_OPENS_MS = 12 * 3_600_000;

export default function Page({ params }: PageProps<"/organizator/[space]/dogodki/[id]/prisotnost/[termin]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/organizator/[space]/dogodki/[id]/prisotnost/[termin]">["params"];
}) {
  const { space: slug, id, termin } = await params;
  const { space } = await requireSpaceRole(slug, "staff");
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(termin)) notFound();
  const supabase = await createClient();
  const [{ data: event }, { data: occ }] = await Promise.all([
    supabase.from("events").select("id, title, space_id").eq("id", id).maybeSingle(),
    supabase
      .from("event_occurrences")
      .select("id, event_id, starts_at, ends_at, status")
      .eq("id", termin)
      .maybeSingle(),
  ]);
  if (!event || event.space_id !== space.id || !occ || occ.event_id !== id) notFound();

  const [{ data: bookings }, { data: marks }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, quantity, occurrence_id, booker:profiles!bookings_booker_id_fkey(display_name, handle)")
      .eq("event_id", id)
      .eq("status", "confirmed")
      .or(`occurrence_id.eq.${termin},occurrence_id.is.null`)
      .order("created_at"),
    supabase.from("attendance").select("booking_id, present").eq("occurrence_id", termin),
  ]);
  const list = (bookings ?? []) as unknown as {
    id: string;
    quantity: number;
    booker: { display_name: string; handle: string } | null;
  }[];
  const markOf = new Map((marks ?? []).map((m) => [m.booking_id, m.present]));
  const open = occ.status === "scheduled" && Date.parse(occ.starts_at) - nowMs() <= ATTENDANCE_OPENS_MS;
  const presentPeople = list.filter((b) => markOf.get(b.id) === true).reduce((n, b) => n + b.quantity, 0);
  const totalPeople = list.reduce((n, b) => n + b.quantity, 0);
  const action = setAttendance.bind(null, slug, id);

  return (
    <div className="space-y-5">
      <BackLink href={`/organizator/${slug}/dogodki/${id}`}>{event.title}</BackLink>
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight break-words">Prisotnost</h1>
        <p className="text-ink-muted">{formatSlot(occ.starts_at, occ.ends_at)}</p>
      </div>
      <Panel title={`Prisotnih ${presentPeople} od ${totalPeople}`}>
        {!open && (
          <p className="mb-3 rounded-2xl bg-sun-soft p-3 text-sm text-sun-ink" role="status">
            {occ.status === "cancelled"
              ? "Termin je odpovedan."
              : "Prisotnost lahko beležiš od 12 ur pred začetkom termina."}
          </p>
        )}
        {list.length === 0 ? (
          <p className="text-sm text-ink-muted">Na ta termin ni prijav.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="attendance-list">
            {list.map((b) => {
              const m = markOf.get(b.id);
              const name = b.booker?.display_name ?? "Uporabnik";
              return (
                <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">
                      {name}{" "}
                      {b.booker && (
                        <span className="text-sm font-normal text-ink-muted">@{b.booker.handle}</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {b.quantity} {pluralSl(b.quantity, ["oseba", "osebi", "osebe", "oseb"])} ·{" "}
                      <span data-testid="attendance-state">
                        {m === true ? "prisoten/-a" : m === false ? "odsoten/-a" : "ni označeno"}
                      </span>
                    </p>
                  </div>
                  {open && (
                    <form action={action} className="flex flex-wrap gap-2">
                      <input type="hidden" name="booking_id" value={b.id} />
                      <input type="hidden" name="occurrence_id" value={termin} />
                      <button
                        type="submit"
                        name="mark"
                        value={m === true ? "clear" : "present"}
                        aria-pressed={m === true}
                        className={buttonClasses(m === true ? "primary" : "secondary", "sm")}
                      >
                        <Check aria-hidden="true" className="size-4" /> Prisoten
                        <span className="sr-only">: {name}</span>
                      </button>
                      <button
                        type="submit"
                        name="mark"
                        value={m === false ? "clear" : "absent"}
                        aria-pressed={m === false}
                        className={buttonClasses(m === false ? "primary" : "ghost", "sm")}
                      >
                        <X aria-hidden="true" className="size-4" /> Odsoten
                        <span className="sr-only">: {name}</span>
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

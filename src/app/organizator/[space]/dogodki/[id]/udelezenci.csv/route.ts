import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { formatSlot } from "@/lib/format";

const paymentLabel: Record<string, string> = {
  none: "",
  awaiting: "Čaka plačilo",
  organizer_confirmed: "Plačano (potrdil organizator)",
};

/** Attendee list for the space team (staff and up). Never cached. */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/organizator/[space]/dogodki/[id]/udelezenci.csv">,
) {
  const { space: slug, id } = await ctx.params;
  const notFound = () => new Response("Ni najdeno.", { status: 404 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Prijava je obvezna.", { status: 401 });

  const { data: space } = await supabase.from("spaces").select("id").eq("slug", slug).maybeSingle();
  if (!space) return notFound();
  const { data: allowed } = await supabase.rpc("is_space_role", { p_space: space.id, min_role: "staff" });
  if (!allowed) return notFound();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, space_id, booking_scope")
    .eq("id", id)
    .maybeSingle();
  if (!event || event.space_id !== space.id) return notFound();

  const [{ data: occ }, { data: bookings }] = await Promise.all([
    supabase
      .from("event_occurrences")
      .select("id, starts_at, ends_at, status")
      .eq("event_id", id)
      .order("starts_at"),
    supabase
      .from("bookings")
      .select(
        "id, occurrence_id, quantity, note, payment_state, amount_cents, created_at, booker:profiles!bookings_booker_id_fkey(display_name, handle)",
      )
      .eq("event_id", id)
      .eq("status", "confirmed")
      .order("created_at"),
  ]);
  const bookingIds = (bookings ?? []).map((b) => b.id);
  const { data: marks } = bookingIds.length
    ? await supabase.from("attendance").select("booking_id, present").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string; present: boolean }[] };
  const sessions = occ ?? [];
  const label = (oid: string | null) => {
    const o = sessions.find((s) => s.id === oid);
    return o ? formatSlot(o.starts_at, o.ends_at) : "Cel tečaj";
  };
  const presentCount = (bid: string) => (marks ?? []).filter((m) => m.booking_id === bid && m.present).length;

  const rows: (string | number | null)[][] = [
    ["Termin", "Ime", "Uporabniško ime", "Število oseb", "Opomba", "Plačilo", "Znesek (EUR)", "Prisotnost"],
  ];
  for (const b of (bookings ?? []) as unknown as {
    id: string;
    occurrence_id: string | null;
    quantity: number;
    note: string | null;
    payment_state: string;
    amount_cents: number | null;
    booker: { display_name: string; handle: string } | null;
  }[]) {
    rows.push([
      label(b.occurrence_id),
      b.booker?.display_name ?? "Uporabnik",
      b.booker ? `@${b.booker.handle}` : "",
      b.quantity,
      b.note,
      paymentLabel[b.payment_state] ?? "",
      b.amount_cents ? (b.amount_cents / 100).toFixed(2).replace(".", ",") : "",
      event.booking_scope === "series"
        ? `${presentCount(b.id)} od ${sessions.filter((s) => s.status === "scheduled").length}`
        : presentCount(b.id) > 0
          ? "prisoten/-a"
          : (marks ?? []).some((m) => m.booking_id === b.id)
            ? "odsoten/-a"
            : "",
    ]);
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="udelezenci-${event.slug.slice(0, 60)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

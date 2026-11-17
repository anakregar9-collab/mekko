import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { localDateKey, weekendDateKeys } from "@/lib/format";
import { coverUrl } from "@/lib/media";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type OccurrenceRow = Database["public"]["Tables"]["event_occurrences"]["Row"];
export type CoverTone = "coral" | "sun" | "sage" | "lilac" | "sky" | "clay";

/** Columns guests are allowed to read (see grants in the M2 migration). */
export const PREVIEW_COLUMNS =
  "id, space_id, slug, title, summary, interest_id, schedule, booking_scope, is_online, visibility, registration_mode, external_url, city, capacity, max_per_booking, cancellation_policy, cover, status, cancel_reason, is_demo, published_at, payment_mode, price_cents, payment_deadline_hours, beginner_friendly, family_friendly, cover_image_path";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  city: string | null;
  cover: CoverTone;
  isOnline: boolean;
  schedule: EventRow["schedule"];
  registrationMode: EventRow["registration_mode"];
  coverImageUrl: string | null;
  /** Null = free; a number = price per person paid directly to the organizer (manual payment). */
  priceCents: number | null;
  capacity: number | null;
  isDemo: boolean;
  interestId: number | null;
  space: { name: string; slug: string } | null;
  next: { id: string; startsAt: string; endsAt: string } | null;
  sessions: number;
  seatsLeft: number | null;
}

type ListRow = Pick<
  EventRow,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "city"
  | "cover"
  | "is_online"
  | "schedule"
  | "booking_scope"
  | "registration_mode"
  | "payment_mode"
  | "price_cents"
  | "beginner_friendly"
  | "family_friendly"
  | "cover_image_path"
  | "capacity"
  | "is_demo"
  | "interest_id"
> & {
  space: { name: string; slug: string } | null;
  occurrences: Pick<OccurrenceRow, "id" | "starts_at" | "ends_at" | "status">[];
};

function cleanQuery(q: string | undefined): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 60);
}

/** Upcoming published public events, soonest first. Search always covers everything (no personalization filter). */
export type QuickFilter = "zacetniki" | "online" | "otroci" | "vikend";
export const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "zacetniki", label: "Za začetnike" },
  { key: "online", label: "Online" },
  { key: "otroci", label: "Za otroke" },
  { key: "vikend", label: "Ta vikend" },
];

export async function listUpcomingEvents(
  opts: { q?: string; interestId?: number; spaceId?: string; limit?: number; quick?: QuickFilter[] } = {},
) {
  const quick = new Set(opts.quick ?? []);
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(
      "id, slug, title, summary, city, cover, is_online, schedule, booking_scope, registration_mode, payment_mode, price_cents, beginner_friendly, family_friendly, cover_image_path, capacity, is_demo, interest_id, space:spaces(name, slug), occurrences:event_occurrences(id, starts_at, ends_at, status)",
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .limit(200);
  const q = cleanQuery(opts.q);
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,city.ilike.%${q}%`);
  if (opts.interestId) query = query.eq("interest_id", opts.interestId);
  if (opts.spaceId) query = query.eq("space_id", opts.spaceId);
  if (quick.has("zacetniki")) query = query.eq("beginner_friendly", true);
  if (quick.has("otroci")) query = query.eq("family_friendly", true);
  if (quick.has("online")) query = query.eq("is_online", true);
  const { data } = await query;
  const now = Date.now();
  const weekend = quick.has("vikend") ? weekendDateKeys(now) : null;

  const cards = ((data ?? []) as unknown as ListRow[])
    .map((e) => {
      const upcoming = e.occurrences
        .filter((o) => o.status === "scheduled" && Date.parse(o.ends_at) > now)
        .filter((o) => !weekend || weekend.includes(localDateKey(o.starts_at)))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return { e, upcoming };
    })
    .filter(({ upcoming }) => upcoming.length > 0)
    .sort((a, b) => a.upcoming[0].starts_at.localeCompare(b.upcoming[0].starts_at))
    .slice(0, opts.limit ?? 60);

  return Promise.all(
    cards.map(async ({ e, upcoming }): Promise<EventCardData> => {
      const next = upcoming[0];
      let seatsLeft: number | null = null;
      if (e.capacity !== null && e.registration_mode === "native") {
        const { data: taken } = await supabase.rpc("seats_taken", {
          p_event: e.id,
          p_occurrence: (e.booking_scope === "series" ? null : next.id) as string,
        });
        seatsLeft = Math.max(e.capacity - (taken ?? 0), 0);
      }
      return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        city: e.city,
        cover: e.cover as CoverTone,
        isOnline: e.is_online,
        schedule: e.schedule,
        registrationMode: e.registration_mode,
        priceCents: e.payment_mode === "manual" ? e.price_cents : null,
        coverImageUrl: coverUrl(e.cover_image_path),
        capacity: e.capacity,
        isDemo: e.is_demo,
        interestId: e.interest_id,
        space: e.space,
        next: { id: next.id, startsAt: next.starts_at, endsAt: next.ends_at },
        sessions: e.occurrences.length,
        seatsLeft,
      };
    }),
  );
}

export async function listInterestsForFilter() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interests")
    .select("id, slug, label_sl")
    .eq("is_active", true)
    .order("sort");
  return data ?? [];
}

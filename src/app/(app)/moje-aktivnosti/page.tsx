import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { MyActivities } from "@/components/visitor/my-activities";
import type { AgendaItem } from "@/lib/calendar";
import type { CoverTone } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Moje aktivnosti" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Moje aktivnosti" />}>
      <Content />
    </Suspense>
  );
}

interface Row {
  id: string;
  occurrence_id: string | null;
  status: "confirmed" | "cancelled_by_user" | "cancelled_by_organizer";
  event: {
    title: string;
    slug: string;
    cover: string;
    occurrences: { id: string; starts_at: string; ends_at: string; status: string }[];
  } | null;
}

async function Content() {
  const profile = await requireUser({ next: "/moje-aktivnosti" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, occurrence_id, status, event:events(title, slug, cover, occurrences:event_occurrences(id, starts_at, ends_at, status))",
    )
    .eq("booker_id", profile.id)
    .in("status", ["confirmed", "cancelled_by_organizer"])
    .order("created_at", { ascending: false });

  const items: AgendaItem[] = [];
  for (const b of (data ?? []) as unknown as Row[]) {
    if (!b.event) continue;
    const occs = [...b.event.occurrences].sort((x, y) => x.starts_at.localeCompare(y.starts_at));
    const list = b.occurrence_id === null ? occs : occs.filter((o) => o.id === b.occurrence_id);
    for (const o of list) {
      items.push({
        bookingId: b.id,
        event: { title: b.event.title, slug: b.event.slug, cover: b.event.cover as CoverTone },
        occurrenceId: o.id,
        startsAt: o.starts_at,
        endsAt: o.ends_at,
        status: b.status,
        sessionNumber: b.occurrence_id === null ? occs.indexOf(o) + 1 : null,
      });
    }
  }
  items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return <MyActivities items={items} today={new Date().toISOString()} base="" />;
}

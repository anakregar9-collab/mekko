import type { Booking, MekkoEvent } from "@/lib/domain/types";
import { localDateKey } from "@/lib/format";

export interface AgendaItem {
  bookingId: string;
  event: MekkoEvent;
  occurrenceId: string;
  startsAt: string;
  endsAt: string;
  status: Booking["status"];
  /** 1-based index within a multi-session series, otherwise null. */
  sessionNumber: number | null;
}

/**
 * Expand bookings into dated agenda entries.
 * A series booking (occurrenceId = null) yields every occurrence of the event;
 * an occurrence booking yields just that one.
 */
export function expandBookings(
  bookings: Booking[],
  getEvent: (id: string) => MekkoEvent | undefined,
): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const b of bookings) {
    const event = getEvent(b.eventId);
    if (!event) continue;
    const occurrences =
      b.occurrenceId === null ? event.occurrences : event.occurrences.filter((o) => o.id === b.occurrenceId);
    occurrences.forEach((o) => {
      items.push({
        bookingId: b.id,
        event,
        occurrenceId: o.id,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        status: b.status,
        sessionNumber: b.occurrenceId === null ? event.occurrences.indexOf(o) + 1 : null,
      });
    });
  }
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function groupByDay(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const it of items) {
    const key = localDateKey(it.startsAt);
    map.set(key, [...(map.get(key) ?? []), it]);
  }
  return map;
}

/** Monday-first month grid (Slovene convention). Returns 'YYYY-MM-DD' or null for padding cells. */
export function monthGrid(year: number, month1: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const days = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

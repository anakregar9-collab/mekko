import { describe, expect, it } from "vitest";
import { expandBookings, groupByDay, monthGrid } from "./calendar";
import { getEventById, myBookings } from "./demo/data";

describe("expandBookings", () => {
  const items = expandBookings(myBookings, getEventById);

  it("expands a series booking into every session of a multi-session course", () => {
    const series = items.filter((i) => i.bookingId === "bk-3");
    expect(series).toHaveLength(4);
    expect(series.map((s) => s.sessionNumber)).toEqual([1, 2, 3, 4]);
  });

  it("keeps an occurrence booking to that one occurrence", () => {
    const joga = items.filter((i) => i.bookingId === "bk-1");
    expect(joga).toHaveLength(1);
    expect(joga[0].occurrenceId).toBe("oc-jog-1");
    expect(joga[0].sessionNumber).toBeNull();
  });

  it("sorts chronologically", () => {
    const starts = items.map((i) => Date.parse(i.startsAt));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it("skips bookings whose event is unknown", () => {
    expect(expandBookings([{ ...myBookings[0], eventId: "missing" }], getEventById)).toEqual([]);
  });

  it("groups by Ljubljana day", () => {
    const byDay = groupByDay(items);
    expect(byDay.get("2026-11-21")?.[0].event.slug).toBe("keramika-za-zacetnike");
  });
});

describe("monthGrid", () => {
  it("starts weeks on Monday — November 2026 starts on a Sunday", () => {
    const cells = monthGrid(2026, 11);
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });
  it("handles February in a leap year", () => {
    expect(monthGrid(2028, 2).filter(Boolean)).toHaveLength(29);
  });
});

import { describe, expect, it } from "vitest";
import { cancellationPolicies, categories, events, ideas, IS_DEMO, myBookings, spaces } from "./data";

describe("demo data integrity", () => {
  it("is flagged as demo", () => {
    expect(IS_DEMO).toBe(true);
  });

  it("references existing spaces, categories and policies", () => {
    const spaceIds = new Set(spaces.map((s) => s.id));
    const cats = new Set(categories.map((c) => c.slug));
    const policies = new Set(cancellationPolicies.map((p) => p.code));
    for (const e of events) {
      expect(spaceIds.has(e.spaceId), e.id).toBe(true);
      expect(cats.has(e.categorySlug), e.id).toBe(true);
      expect(policies.has(e.cancellationPolicyCode), e.id).toBe(true);
    }
    for (const i of ideas) expect(cats.has(i.categorySlug), i.id).toBe(true);
  });

  it("keeps slugs unique", () => {
    expect(new Set(events.map((e) => e.slug)).size).toBe(events.length);
  });

  it("models schedule ↔ booking scope consistently", () => {
    for (const e of events) {
      if (e.schedule === "multi_session") expect(e.bookingScope).toBe("series");
      else expect(e.bookingScope).toBe("occurrence");
      if (e.schedule === "one_off") expect(e.occurrences).toHaveLength(1);
      for (const o of e.occurrences) expect(Date.parse(o.endsAt)).toBeGreaterThan(Date.parse(o.startsAt));
    }
  });

  it("only uses external URLs for external registration", () => {
    for (const e of events) expect(Boolean(e.externalUrl)).toBe(e.registrationMode === "external");
  });

  it("never books an external event natively", () => {
    const external = new Set(events.filter((e) => e.registrationMode === "external").map((e) => e.id));
    for (const b of myBookings) expect(external.has(b.eventId)).toBe(false);
  });

  it("uses null occurrence only for series bookings", () => {
    for (const b of myBookings) {
      const e = events.find((x) => x.id === b.eventId)!;
      expect(b.occurrenceId === null).toBe(e.bookingScope === "series");
    }
  });
});

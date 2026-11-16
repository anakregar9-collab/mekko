import { describe, expect, it } from "vitest";
import {
  deadlineLabel,
  formatPrice,
  priceToCents,
  formatPriceRange,
  formatSlot,
  ljubljanaToISO,
  localDateKey,
  pluralSl,
  spotsLeftLabel,
} from "./format";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("formatPrice", () => {
  it("formats euro cents in Slovene style", () => {
    expect(nbsp(formatPrice(4500))).toBe("45,00 €");
    // Slovene CLDR groups only from 5 digits: 1234,56 € but 12.345,67 €.
    expect(nbsp(formatPrice(123456))).toBe("1234,56 €");
    expect(nbsp(formatPrice(1234567))).toBe("12.345,67 €");
  });
  it("labels zero as free", () => {
    expect(formatPrice(0)).toBe("Brezplačno");
  });
  it("rejects invalid amounts", () => {
    expect(() => formatPrice(-1)).toThrow(RangeError);
    expect(() => formatPrice(1.5)).toThrow(RangeError);
  });
});

describe("formatPriceRange", () => {
  it("handles free, single and mixed prices", () => {
    expect(formatPriceRange([])).toBe("Brezplačno");
    expect(formatPriceRange([0, 0])).toBe("Brezplačno");
    expect(nbsp(formatPriceRange([2800]))).toBe("28,00 €");
    expect(nbsp(formatPriceRange([8000, 4500]))).toBe("od 45,00 €");
    expect(nbsp(formatPriceRange([0, 1500]))).toBe("od 15,00 €");
  });
});

describe("dates in Europe/Ljubljana", () => {
  it("renders local time regardless of process TZ", () => {
    expect(formatSlot("2026-11-21T09:00:00Z", "2026-11-21T12:00:00Z")).toContain("10:00–13:00");
  });
  it("computes the local calendar day across midnight UTC", () => {
    expect(localDateKey("2026-11-21T23:30:00Z")).toBe("2026-11-22");
  });
});

describe("Slovene plurals", () => {
  it.each([
    [1, "prosto mesto"],
    [2, "prosti mesti"],
    [3, "prosta mesta"],
    [4, "prosta mesta"],
    [5, "prostih mest"],
    [101, "prosto mesto"],
    [102, "prosti mesti"],
  ])("%i → %s", (n, expected) => {
    expect(pluralSl(n, ["prosto mesto", "prosti mesti", "prosta mesta", "prostih mest"])).toBe(expected);
  });

  it("builds spots-left labels", () => {
    expect(spotsLeftLabel(null, 3)).toBe("Brez omejitve mest");
    expect(spotsLeftLabel(8, 8)).toBe("Razprodano");
    expect(spotsLeftLabel(8, 6)).toBe("Še 2 prosti mesti");
  });
});

describe("ljubljanaToISO", () => {
  it("handles winter (CET, UTC+1) and summer (CEST, UTC+2) time", () => {
    expect(ljubljanaToISO("2026-12-05", "17:30")).toBe("2026-12-05T16:30:00.000Z");
    expect(ljubljanaToISO("2026-07-01", "09:00")).toBe("2026-07-01T07:00:00.000Z");
  });
  it("rejects malformed input", () => {
    expect(() => ljubljanaToISO("5.12.2026", "17:30")).toThrow(RangeError);
  });
});

describe("priceToCents", () => {
  it("parses whole and decimal euro amounts", () => {
    expect(priceToCents("25")).toBe(2500);
    expect(priceToCents("25,5")).toBe(2550);
    expect(priceToCents("25.50")).toBe(2550);
    expect(priceToCents(" 12 € ")).toBe(1200);
  });
  it("rejects garbage, negatives and too many decimals", () => {
    expect(priceToCents("")).toBeNull();
    expect(priceToCents("-5")).toBeNull();
    expect(priceToCents("abc")).toBeNull();
    expect(priceToCents("1,234")).toBeNull();
    expect(priceToCents("99999")).toBeNull();
  });
});

describe("deadlineLabel", () => {
  it("uses Slovene dual/plural forms", () => {
    expect(deadlineLabel(24)).toBe("1 dan");
    expect(deadlineLabel(48)).toBe("2 dneva");
    expect(deadlineLabel(72)).toBe("3 dnevi");
    expect(deadlineLabel(168)).toBe("7 dni");
  });
});

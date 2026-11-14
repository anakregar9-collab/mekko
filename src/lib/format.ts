/** Slovene formatting helpers. All dates render in Europe/Ljubljana regardless of server TZ. */

export const LOCALE = "sl-SI";
export const TIME_ZONE = "Europe/Ljubljana";

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`Invalid price in cents: ${cents}`);
  }
  if (cents === 0) return "Brezplačno";
  return priceFormatter.format(cents / 100);
}

/** "od 12,00 €", "Brezplačno" or "12,00 €" for a list of ticket prices. */
export function formatPriceRange(pricesCents: number[]): string {
  const paid = pricesCents.filter((p) => p > 0);
  if (paid.length === 0) return "Brezplačno";
  const min = Math.min(...paid);
  const allSame = paid.length === pricesCents.length && paid.every((p) => p === min);
  return allSame ? formatPrice(min) : `od ${formatPrice(min)}`;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** "sob., 21. nov. · 10:00–13:00" */
export function formatSlot(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} · ${formatTime(startIso)}–${formatTime(endIso)}`;
}

/** Calendar key in Ljubljana time, e.g. "2026-11-21". */
export function localDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  return parts;
}

/** Slovene plural forms: 1 mesto, 2 mesti, 3-4 mesta, 5+ mest. */
export function pluralSl(n: number, forms: [string, string, string, string]): string {
  const mod100 = Math.abs(n) % 100;
  if (mod100 === 1) return forms[0];
  if (mod100 === 2) return forms[1];
  if (mod100 === 3 || mod100 === 4) return forms[2];
  return forms[3];
}

export function spotsLeftLabel(capacity: number | null, taken: number): string {
  if (capacity === null) return "Brez omejitve mest";
  const left = Math.max(capacity - taken, 0);
  if (left === 0) return "Razprodano";
  return `Še ${left} ${pluralSl(left, ["prosto mesto", "prosti mesti", "prosta mesta", "prostih mest"])}`;
}

/**
 * Convert a wall-clock date + time in Europe/Ljubljana (e.g. "2026-12-05", "17:30")
 * to an ISO timestamp with the correct UTC offset (handles CET/CEST).
 */
export function ljubljanaToISO(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new RangeError("Invalid date/time");
  const naiveUtc = Date.parse(`${date}T${time}:00Z`);
  const offsetMin = (instant: number) => {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" })
      .formatToParts(new Date(instant))
      .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+1"
    const m = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  };
  // Two passes settle the offset around DST changes.
  let guess = naiveUtc - offsetMin(naiveUtc) * 60_000;
  guess = naiveUtc - offsetMin(guess) * 60_000;
  return new Date(guess).toISOString();
}

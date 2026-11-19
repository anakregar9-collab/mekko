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

/** Organizer price input → cents. Accepts "25", "25,50", "25.5", "25 €". Null when invalid. */
export function priceToCents(input: string): number | null {
  const m = input.replace(/\s|€/g, "").match(/^(\d{1,4})(?:[.,](\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/** Money total in euros, zero shown as "0,00 €" (unlike formatPrice, which says "Brezplačno"). */
export function formatAmount(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** 24 → "1 dan", 48 → "2 dni", 72 → "3 dni", 168 → "7 dni". */
export function deadlineLabel(hours: number): string {
  const days = Math.round(hours / 24);
  return `${days} ${pluralSl(days, ["dan", "dneva", "dnevi", "dni"])}`;
}

/**
 * Date keys (YYYY-MM-DD, Ljubljana time) of "this weekend": the coming Saturday and Sunday,
 * or the rest of the current weekend when today is Saturday/Sunday.
 */
export function weekendDateKeys(nowMs: number): string[] {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(
    new Date(nowMs),
  );
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const key = (offsetDays: number) => localDateKey(new Date(nowMs + offsetDays * 86_400_000).toISOString());
  if (dayIndex === 0) return [key(0)];
  if (dayIndex === 6) return [key(0), key(1)];
  const toSat = 6 - dayIndex;
  return [key(toSat), key(toSat + 1)];
}

/** Month view bounds in Ljubljana time for "YYYY-MM"; falls back to the month of `nowIso`. */
export function monthRange(
  ym: string | undefined,
  nowIso: string,
): { key: string; startIso: string; endIso: string; prev: string; next: string; label: string } {
  const valid = ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? ym : localDateKey(nowIso).slice(0, 7);
  const [y, m] = valid.split("-").map(Number);
  const shift = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const next = shift(1);
  const label = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return {
    key: valid,
    startIso: ljubljanaToISO(`${valid}-01`, "00:00"),
    endIso: ljubljanaToISO(`${next}-01`, "00:00"),
    prev: shift(-1),
    next,
    label,
  };
}

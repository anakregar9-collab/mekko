import { describe, expect, it } from "vitest";
import { slugify, SLUG_RE } from "./slug";
import { createSpaceSchema, inviteSchema, onboardingSchema, safeNext } from "./validation";
import { friendlyDbError } from "./db/errors";
import { activeVisitorTab, makeVisitorTabs } from "./navigation";

describe("slugify", () => {
  it.each([
    ["Glinena hiša", "glinena-hisa"],
    ["Krožek Nitka – Celje!", "krozek-nitka-celje"],
    ["  Čaj & Šivanje  ", "caj-sivanje"],
    ["Ćevapi Đurđa", "cevapi-durda"],
  ])("%s → %s", (input, out) => {
    expect(slugify(input)).toBe(out);
    expect(SLUG_RE.test(out)).toBe(true);
  });
  it("caps length at 50 without a trailing hyphen", () => {
    const s = slugify("a ".repeat(60));
    expect(s.length).toBeLessThanOrEqual(50);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("safeNext (open-redirect guard)", () => {
  it.each([
    ["/organizator", "/organizator"],
    ["//evil.example", "/moj-mekko"],
    ["/\\evil.example", "/moj-mekko"],
    ["https://evil.example", "/moj-mekko"],
    ["", "/moj-mekko"],
    [null, "/moj-mekko"],
  ])("%s → %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });
});

describe("schemas", () => {
  it("rejects reserved and malformed space slugs", () => {
    const base = { kind: "studio", name: "Test" };
    expect(createSpaceSchema.safeParse({ ...base, slug: "nov-prostor" }).success).toBe(false);
    expect(createSpaceSchema.safeParse({ ...base, slug: "Velike Črke" }).success).toBe(false);
    expect(createSpaceSchema.safeParse({ ...base, slug: "glinena-hisa" }).success).toBe(true);
  });
  it("normalizes invite handles and only allows admin/staff", () => {
    expect(inviteSchema.parse({ handle: " Ana.K ", role: "staff" }).handle).toBe("ana.k");
    expect(inviteSchema.safeParse({ handle: "ana", role: "owner" }).success).toBe(false);
  });
  it("validates onboarding handle format", () => {
    const ok = {
      display_name: "Ana",
      handle: "ana_k",
      visibility: "members",
      interests: ["1"],
      location_consent: false,
    };
    expect(onboardingSchema.safeParse(ok).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...ok, handle: "a" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...ok, visibility: "everyone" }).success).toBe(false);
  });
});

describe("friendlyDbError", () => {
  it("maps RPC errors and constraint violations to Slovene, never raw text", () => {
    expect(friendlyDbError({ message: "not_allowed" })).toBe("Za to nimaš dovoljenja.");
    expect(
      friendlyDbError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_handle_key"',
      }),
    ).toBe("To uporabniško ime je že zasedeno.");
    expect(friendlyDbError({ code: "XX000", message: "internal stack trace" })).toBe(
      "Nekaj je šlo narobe. Poskusi znova.",
    );
  });
});

describe("live navigation", () => {
  it("uses the same four tabs without the prototype prefix", () => {
    expect(makeVisitorTabs("").map((t) => t.href)).toEqual([
      "/odkrivanje",
      "/moje-aktivnosti",
      "/ustvari",
      "/moj-mekko",
    ]);
    expect(activeVisitorTab("/moj-mekko/profil", "")).toBe("moj-mekko");
    expect(activeVisitorTab("/prototip/moj-mekko", "")).toBeNull();
  });
});

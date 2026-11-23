import { expect, test } from "@playwright/test";
import { checkPage, serviceClient, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("discovery shows 24 events at a time; Pokaži več keeps the search and seat counts stay right", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  await signUp(org, "Organizatorka Mnogih");
  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Mnogo ${uid("")}`)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));

  // One event through the UI (with capacity), then 29 copies through the service key (test setup only).
  const word = `Serija${uid("")}`;
  await org.goto(`/organizator/${slug}/dogodki/nov`);
  await org.getByLabel("Ime dogodka").fill(`${word} prvi`);
  await org.getByLabel(/^Datum/).fill(dateInDays(2));
  await org.getByLabel("Kraj", { exact: true }).fill("Ptuj");
  await org.getByLabel("Število mest").fill("6");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const firstId = org.url().split("/").pop()!;

  const sb = serviceClient();
  const { data: first } = await sb.from("events").select("*").eq("id", firstId).single();
  const { data: occ } = await sb
    .from("event_occurrences")
    .select("id, starts_at, ends_at")
    .eq("event_id", firstId)
    .single();
  // Two seats taken on the soonest event, so its card must say 4 of 6 left.
  const { error: bookErr } = await sb
    .from("bookings")
    .insert({ event_id: firstId, occurrence_id: occ!.id, booker_id: first!.created_by, quantity: 2 });
  expect(bookErr).toBeNull();
  for (let i = 1; i < 30; i++) {
    const { id: _id, slug: _s, created_at: _c, updated_at: _u, published_at: _p, ...rest } = first!;
    void _id;
    void _s;
    void _c;
    void _u;
    void _p;
    const { data: ev, error } = await sb
      .from("events")
      .insert({
        ...rest,
        slug: `${word.toLowerCase()}-${i}`,
        title: `${word} ${i}`,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    const shift = i * 3_600_000;
    await sb.from("event_occurrences").insert({
      event_id: ev!.id,
      starts_at: new Date(Date.parse(occ!.starts_at) + shift).toISOString(),
      ends_at: new Date(Date.parse(occ!.ends_at) + shift).toISOString(),
    });
  }

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/odkrivanje?q=${word}`);
  const cards = guest.getByTestId("feed").filter({ visible: true }).locator(":scope > li");
  await expect(cards).toHaveCount(24);
  await expect(cards.first()).toContainText("Še 4 prosta mesta");
  await checkPage(guest);
  await guest.getByTestId("show-more").filter({ visible: true }).click();
  await expect(guest).toHaveURL(/vec=48/);
  await expect(guest).toHaveURL(new RegExp(`q=${word}`));
  await expect(cards).toHaveCount(30);
  await expect(guest.getByTestId("show-more").filter({ visible: true })).toHaveCount(0);
});

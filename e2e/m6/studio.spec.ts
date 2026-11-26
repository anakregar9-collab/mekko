import { expect, test, type Page } from "@playwright/test";
import { checkPage, serviceClient, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function newSpace(org: Page, name: string) {
  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`${name} ${uid("")}`)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));
  return slug;
}

test("studio: attendance for today's session, CSV export for the team only, month calendar", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await signUp(org, "Studijska Lea");
  await signUp(visitor, "Udeleženka Iza");
  const slug = await newSpace(org, "Studio prisotnost");

  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Prisotnost ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(7));
  await org.getByLabel("Kraj", { exact: true }).fill("Koper");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();
  const eventId = manageUrl.split("/").pop()!;

  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: new RegExp(title) }).click();
  await visitor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(visitor.getByTestId("my-booking")).toBeVisible();

  // Test setup: move the session to start in one hour (attendance opens 12 h before).
  const starts = new Date(Date.now() + 3_600_000);
  const { error } = await serviceClient()
    .from("event_occurrences")
    .update({
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + 7_200_000).toISOString(),
    })
    .eq("event_id", eventId);
  expect(error).toBeNull();

  await org.goto(manageUrl);
  await org.getByTestId("attendance-links").getByRole("link").first().click();
  await expect(org).toHaveURL(/\/prisotnost\/[0-9a-f-]{36}$/);
  await expect(org.getByRole("heading", { name: "Prisotnost", exact: true })).toBeVisible();
  const row = org.getByTestId("attendance-list").locator("li").filter({ hasText: "Udeleženka Iza" });
  await expect(row.getByTestId("attendance-state")).toHaveText("ni označeno");
  await row.getByRole("button", { name: /Prisoten/ }).click();
  await expect(row.getByTestId("attendance-state")).toHaveText("prisoten/-a");
  await expect(org.getByText("Prisotnih 1 od 1")).toBeVisible();
  await checkPage(org);

  const csvUrl = `/organizator/${slug}/dogodki/${eventId}/udelezenci.csv`;
  const csv = await org.request.get(csvUrl);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const body = await csv.text();
  expect(body).toContain("Udeleženka Iza");
  expect(body).toContain("prisoten/-a");
  const denied = await visitor.request.get(csvUrl);
  expect(denied.status()).toBe(404);

  await org.getByRole("link", { name: "Koledar" }).first().click();
  await expect(org.getByTestId("calendar")).toContainText(title);
  await expect(org.getByTestId("calendar")).toContainText("1 prijavljenih");
  await checkPage(org);
  await org.getByRole("link", { name: /Naslednji/ }).click();
  await expect(org).toHaveURL(/mesec=\d{4}-\d{2}/);
});

test("studio: payments overview lists awaiting and confirmed manual payments", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await signUp(org, "Blagajničarka Sara");
  await signUp(visitor, "Plačnik Tim");
  const slug = await newSpace(org, "Studio plačila");

  await org.goto(`/organizator/${slug}/placila`);
  await expect(org.getByText("Še ni plačljivih dogodkov")).toBeVisible();

  await org.goto(`/organizator/${slug}/nastavitve`);
  const legal = org.getByTestId("legal-form");
  await legal.getByText("Samostojni podjetnik (s.p.)").click();
  await legal.getByLabel("Ime ali naziv ponudnika").fill("Sara Kos s.p.");
  await legal.getByLabel("Naslov").fill("Prešernova 1, 4000 Kranj");
  await legal.getByLabel("Matična ali davčna številka").fill("7654321");
  await legal.getByLabel("E-pošta za stranke").fill("sara@example.test");
  await legal.getByLabel(/Razumem in potrjujem/).check();
  await legal.getByRole("button", { name: "Shrani pravne podatke" }).click();
  await expect(legal.getByText("Pravni podatki so shranjeni.")).toBeVisible();

  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Plačljivo ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(10));
  await org.getByLabel("Kraj", { exact: true }).fill("Kranj");
  await org.getByText("Plačilo organizatorju").click();
  await org.getByLabel("Cena na osebo (€)").fill("30");
  await org.getByLabel("Navodila za plačilo").fill("Nakazilo na SI56 TEST");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();

  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: new RegExp(title) }).click();
  await visitor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(visitor.getByTestId("my-booking")).toBeVisible();

  await org.goto(`/organizator/${slug}/placila`);
  await expect(org.getByTestId("awaiting-payments")).toContainText("Plačnik Tim");
  await expect(org.getByTestId("payment-stats")).toContainText("30,00");
  await expect(org.getByTestId("payments-by-event")).toContainText(title);
  await checkPage(org);
});

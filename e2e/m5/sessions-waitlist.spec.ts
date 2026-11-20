import { expect, test, type Page } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function createEvent(org: Page, opts: { kind: string; capacity?: string; membersOnly?: boolean }) {
  await org.goto(
    `/organizator/nov-prostor?vrsta=${opts.kind}&ime=${encodeURIComponent(`Termini ${uid("")}`)}`,
  );
  const spaceSlug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${spaceSlug}$`));
  await org.goto(`/organizator/${spaceSlug}/dogodki/nov`);
  const title = `Termini ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(8));
  await org.getByLabel("Kraj", { exact: true }).fill("Maribor");
  if (opts.capacity) await org.getByLabel("Število mest").fill(opts.capacity);
  if (opts.membersOnly) await org.getByLabel("Samo za člane prostora").check();
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  return { spaceSlug, title, manageUrl: org.url() };
}

async function openEvent(page: Page, title: string) {
  await page.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("organizer reschedules, adds and cancels a session; attendee is notified", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await signUp(org, "Organizatorka Tina");
  await signUp(visitor, "Udeleženec Miha");
  const { title, manageUrl } = await createEvent(org, { kind: "studio" });

  await openEvent(visitor, title);
  await visitor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(visitor.getByTestId("my-booking")).toBeVisible();

  await org.goto(manageUrl);
  const panel = org.getByTestId("sessions-panel");
  await expect(panel.getByTestId("session")).toHaveCount(1);
  await checkPage(org);
  await panel.getByText("Premakni termin").click();
  await panel.getByLabel("Datum").first().fill(dateInDays(10));
  await panel.getByLabel("Od").first().fill("18:00");
  await panel.getByLabel("Do").first().fill("20:00");
  await panel.getByRole("button", { name: "Shrani nov termin" }).click();
  await expect(panel.getByText("Termin je premaknjen. Obveščenih: 1.")).toBeVisible();

  await panel.getByText("+ Dodaj termin").click();
  const add = panel.locator("form").last();
  await add.getByLabel("Datum").fill(dateInDays(12));
  await add.getByLabel("Od").fill("10:00");
  await add.getByLabel("Do").fill("12:00");
  await add.getByRole("button", { name: "Dodaj termin" }).click();
  await expect(panel.getByTestId("session")).toHaveCount(2);

  await visitor.goto("/obvestila");
  await expect(visitor.getByTestId("notifications")).toContainText(`Termin je spremenjen: ${title}`);
  await expect(visitor.getByTestId("notifications")).toContainText("Tvoja prijava ostaja");

  await org.goto(manageUrl);
  const first = org.getByTestId("session").first();
  await first.getByText("Odpovej termin").click();
  await first.getByLabel("Razlog (vidijo ga prijavljeni)").fill("Bolezen predavateljice");
  await first.getByRole("button", { name: "Odpovej ta termin" }).click();
  await expect(org.getByTestId("session").first()).toContainText("(odpovedan)");

  await visitor.goto("/obvestila");
  await expect(visitor.getByTestId("notifications")).toContainText(`Termin je odpovedan: ${title}`);
});

test("full session: waitlist, spot frees up, waiting person is notified", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const first = await (await browser.newContext()).newPage();
  const second = await (await browser.newContext()).newPage();
  await signUp(org, "Organizator Rok");
  await signUp(first, "Prva Ana");
  await signUp(second, "Druga Maja");
  const { title } = await createEvent(org, { kind: "studio", capacity: "1" });

  await openEvent(first, title);
  await first.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(first.getByTestId("my-booking")).toBeVisible();

  await openEvent(second, title);
  const wl = second.getByTestId("waitlist-form");
  await expect(wl).toBeVisible();
  await checkPage(second);
  await wl.getByRole("button", { name: "Obvesti me, ko se sprosti mesto" }).click();
  await expect(second.getByTestId("my-waitlist")).toContainText("Na čakalni listi si");

  first.once("dialog", (d) => d.accept());
  await first
    .getByTestId("my-booking")
    .getByRole("button", { name: /Odjavi/ })
    .click();
  await expect(first.getByTestId("my-booking")).toHaveCount(0);

  await second.goto("/obvestila");
  await expect(second.getByTestId("notifications")).toContainText(`Sprostilo se je mesto: ${title}`);
});

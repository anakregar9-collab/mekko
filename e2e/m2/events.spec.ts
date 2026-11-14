import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

test("app opens on Odkrivanje with test events; guests see a preview only", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/odkrivanje$/);
  await expect(page.getByTestId("feed").locator(":scope > li").first()).toBeVisible();
  await checkPage(page);

  await page
    .getByRole("link", { name: /Keramika za začetnike/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dogodki\/keramika-za-zacetnike/);
  await expect(page.getByText("Testni dogodek").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByTestId("login-gate")).toBeVisible();
  await expect(page.getByText("Trubarjeva cesta 12")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Prijavi se za udeležbo" })).toBeVisible();
  await checkPage(page);

  await page.getByRole("link", { name: /Glinena hiša/ }).click();
  await expect(page.getByRole("heading", { name: "Glinena hiša" })).toBeVisible();
  await checkPage(page);
});

test("search and categories filter the feed", async ({ page }) => {
  await page.goto("/odkrivanje?q=pletenja");
  const cards = page.getByTestId("feed").locator(":scope > li");
  await expect(cards).toHaveCount(1);
  await page.goto("/odkrivanje?q=zzzneobstaja");
  await expect(page.getByText("Ni zadetkov")).toBeVisible();
  await page.goto("/odkrivanje");
  await page.getByRole("navigation", { name: "Kategorije" }).getByRole("link", { name: "Keramika" }).click();
  await expect(page).toHaveURL(/kategorija=keramika/);
  await expect(cards.filter({ hasText: "Tečaj pletenja" })).toHaveCount(0);
});

test("organizer publishes an event, visitor books, organizer notifies and cancels", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await signUp(org, "Organizatorka Eva");
  await signUp(visitor, "Obiskovalec Jan");

  // Organizer: space → new event.
  await org.goto(`/organizator/nov-prostor?vrsta=solo_creator&ime=Eva%20${uid("")}`);
  const spaceSlug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${spaceSlug}$`));
  await org.getByRole("link", { name: "Dogodki" }).click();
  await org.getByRole("link", { name: "Nov dogodek" }).click();
  await checkPage(org);

  const title = `Linorez ${uid("")}`;
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Vsaj 3 znaki.")).toBeVisible();
  await expect(org.getByText("Vsak termin potrebuje datum.")).toBeVisible();

  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel("Kratek opis", { exact: true }).fill("Izreži in natisni svojo razglednico.");
  await org.getByLabel("Podroben opis").fill("Dve uri tiskanja z linorezom.");
  await org.getByLabel(/^Datum/).fill(dateInDays(10));
  await org.getByLabel("Kraj", { exact: true }).fill("Ljubljana");
  await org.getByLabel("Naslov lokacije").fill("Metelkova 6, Ljubljana");
  await org.getByLabel("Število mest").fill("3");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByRole("heading", { name: title })).toBeVisible();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();

  // Visitor: finds it via search, sees the address, books 2 people.
  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: new RegExp(title) }).click();
  await expect(visitor.getByText("Metelkova 6, Ljubljana")).toBeVisible();
  await checkPage(visitor);
  await visitor.getByLabel("Število oseb").selectOption("2");
  await visitor.getByLabel("Sporočilo organizatorju (neobvezno)").fill("Prideva s prijateljico");
  await visitor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(visitor.getByTestId("my-booking")).toContainText("2 osebi");

  // Only 1 seat left now.
  await expect(visitor.getByTestId("unread-count")).toHaveText(/1/);
  await visitor.goto("/moje-aktivnosti");
  await expect(visitor.getByTestId("activities-list")).toContainText(title);
  await checkPage(visitor);

  // Organizer: sees the attendee, sends an announcement, then cancels.
  await org.goto(manageUrl);
  const attendees = org.getByTestId("attendees");
  await expect(attendees).toContainText("Obiskovalec Jan");
  await expect(attendees).toContainText("Prideva s prijateljico");
  await expect(attendees).toContainText("2 / 3");
  await org.getByLabel("Sporočilo").fill("Prinesite stara oblačila!");
  await org.getByRole("button", { name: "Pošlji obvestilo" }).click();
  await expect(org.getByText("Obvestilo je poslano (1 prejemnikov).")).toBeVisible();
  await checkPage(org);

  org.once("dialog", (d) => d.accept());
  await org.getByLabel("Razlog (vidijo ga udeleženci)").fill("Bolezen");
  await org.getByRole("button", { name: "Odpovej dogodek" }).click();
  await expect(org.getByRole("heading", { name: "Odpovedano" })).toBeVisible();

  // Visitor: gets both notifications; the booking shows as cancelled by organizer.
  await visitor.goto("/obvestila");
  const notes = visitor.getByTestId("notifications");
  await expect(notes).toContainText("Prinesite stara oblačila!");
  await expect(notes).toContainText("Dogodek je odpovedan");
  await checkPage(visitor);
  await visitor.goto("/moje-aktivnosti");
  await expect(visitor.getByTestId("activities-list")).toContainText("Odpovedal organizator");
});

test("outsiders cannot open another space's event management", async ({ browser }) => {
  const outsider = await (await browser.newContext()).newPage();
  await signUp(outsider, "Radovedna Oseba");
  await outsider.goto("/organizator/glinena-hisa/dogodki");
  await expect(outsider.getByText("Strani ni bilo mogoče najti")).toBeVisible();
});

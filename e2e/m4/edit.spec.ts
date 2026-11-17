import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("organizer edits a published event; capacity guard; attendees learn about a new location", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await signUp(org, "Organizatorka Nika");
  await signUp(visitor, "Obiskovalec Luka");

  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Urejanje ${uid("")}`)}`);
  const spaceSlug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${spaceSlug}$`));
  await org.goto(`/organizator/${spaceSlug}/dogodki/nov`);
  const title = `Batik ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(6));
  await org.getByLabel("Kraj", { exact: true }).fill("Ljubljana");
  await org.getByLabel("Naslov lokacije").fill("Metelkova 6, Ljubljana");
  await org.getByLabel("Število mest").fill("5");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();

  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: new RegExp(title) }).click();
  await visitor.getByLabel("Število oseb").selectOption("3");
  await visitor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(visitor.getByTestId("my-booking")).toBeVisible();

  await org.goto(manageUrl);
  await org.getByRole("link", { name: "Uredi dogodek" }).click();
  await expect(org.getByText("Že prijavljenih: 3.")).toBeVisible();
  await checkPage(org);
  await org.getByLabel("Število mest").fill("2");
  await org.getByRole("button", { name: "Shrani spremembe" }).click();
  await expect(
    org.getByText("Število mest ne more biti manjše od števila že prijavljenih oseb."),
  ).toBeVisible();

  await org.getByLabel("Ime dogodka").fill(`${title} – nova lokacija`);
  await org.getByLabel("Število mest").fill("3");
  await org.getByLabel("Naslov lokacije").fill("Trubarjeva 20, Ljubljana");
  await org.getByLabel("Primerno za začetnike").check();
  await org.getByRole("button", { name: "Shrani spremembe" }).click();
  await expect(org).toHaveURL(manageUrl);
  await expect(org.getByRole("heading", { name: `${title} – nova lokacija` })).toBeVisible();

  await visitor.goto("/obvestila");
  await expect(visitor.getByTestId("notifications")).toContainText(
    "Lokacija je spremenjena: Trubarjeva 20, Ljubljana",
  );
});

test("author edits an idea; others cannot open the editor", async ({ browser }) => {
  const author = await (await browser.newContext()).newPage();
  const other = await (await browser.newContext()).newPage();
  await signUp(author, "Avtorica Eva");
  await signUp(other, "Radoveden Jure");

  await author.goto("/ustvari/ideja");
  const title = `Šopek iz papirja ${uid("")}`;
  await author.getByLabel("Naslov ideje").fill(title);
  await author.getByLabel("Kategorija").selectOption({ label: "Dom, deko in rastline" });
  await author.getByLabel("Navodila").fill("1. Izreži cvetove.\n2. Zlepi jih na žico.\n3. Zveži šopek.");
  await author.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(author).toHaveURL(/\/ideje\//);
  const ideaUrl = author.url();

  await author.getByRole("link", { name: "Uredi idejo" }).click();
  await expect(author.getByLabel("Naslov ideje")).toHaveValue(title);
  await checkPage(author);
  await author.getByLabel("Naslov ideje").fill(`${title} v2`);
  await author.getByLabel("Koliko časa vzame (neobvezno)").fill("45 minut");
  await author.getByRole("button", { name: "Shrani spremembe" }).click();
  await expect(author).toHaveURL(ideaUrl);
  await expect(author.getByRole("heading", { name: `${title} v2` })).toBeVisible();
  await expect(author.getByText("45 minut")).toBeVisible();

  await other.goto(ideaUrl);
  await expect(other.getByRole("link", { name: "Uredi idejo" })).toHaveCount(0);
  await other.goto(`${ideaUrl}/uredi`);
  await expect(other.getByText("Strani ni bilo mogoče najti")).toBeVisible();
});

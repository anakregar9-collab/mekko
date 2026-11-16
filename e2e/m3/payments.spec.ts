import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
const nbsp = (s: string) => s.replace(/ /g, " ");

test("manual payment: reserve, organizer confirms receipt or releases the seat", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const ana = await (await browser.newContext()).newPage();
  const bor = await (await browser.newContext()).newPage();
  await signUp(org, "Organizatorka Vesna");
  await signUp(ana, "Obiskovalka Ana");
  await signUp(bor, "Obiskovalec Bor");

  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Statve ${uid("")}`)}`);
  const spaceSlug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${spaceSlug}$`));
  // Paid events need the organizer's legal status first.
  await org.goto(`/organizator/${spaceSlug}/dogodki/nov`);
  await org.getByText("Plačilo organizatorju").click();
  await expect(org.getByTestId("legal-needed")).toBeVisible();
  await org.goto(`/organizator/${spaceSlug}/nastavitve`);
  const legal = org.getByTestId("legal-form");
  await legal.getByText("Samostojni podjetnik (s.p.)").click();
  await legal.getByRole("button", { name: "Shrani pravne podatke" }).click();
  await expect(legal.getByText("Vpiši ime ali naziv.")).toBeVisible();
  await expect(legal.getByText("Vpiši matično ali davčno številko.")).toBeVisible();
  await legal.getByLabel("Ime ali naziv ponudnika").fill("Vesna Novak s.p.");
  await legal.getByLabel("Naslov").fill("Metelkova 6, 1000 Ljubljana");
  await legal.getByLabel("Matična ali davčna številka").fill("1234567");
  await legal.getByLabel("E-pošta za stranke").fill("vesna@example.test");
  await legal.getByRole("button", { name: "Shrani pravne podatke" }).click();
  await expect(legal.getByText("Pravni podatki so shranjeni.")).toBeVisible();
  await checkPage(org);
  await org.goto(`/organizator/${spaceSlug}/dogodki/nov`);

  const title = `Tkanje ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel("Kratek opis", { exact: true }).fill("Stkaj podstavek.");
  await org.getByLabel(/^Datum/).fill(dateInDays(9));
  await org.getByLabel("Kraj", { exact: true }).fill("Ljubljana");
  await org.getByLabel("Naslov lokacije").fill("Metelkova 6, Ljubljana");
  await org.getByLabel("Število mest").fill("4");
  await org.getByText("Plačilo organizatorju").click();
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Vpiši ceno med 0,50 in 1000 €.")).toBeVisible();
  await expect(org.getByText("Napiši, kako naj udeleženci plačajo.")).toBeVisible();
  await org.getByLabel("Cena na osebo (€)").fill("25");
  await org.getByLabel("Navodila za plačilo").fill("Gotovina na kraju ali nakazilo na SI56 TEST");
  await org.getByLabel("Rok za plačilo").selectOption("72");
  await checkPage(org);
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();

  // Visitor: price on the card and the event page, instructions after sign-in.
  await ana.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await expect(ana.getByTestId("feed")).toContainText(nbsp("25,00 €"));
  await ana.getByRole("link", { name: new RegExp(title) }).click();
  await expect(ana.getByTestId("price")).toContainText("Plačaš neposredno organizatorju");
  await expect(ana.getByTestId("payment-instructions")).toContainText("SI56 TEST");
  await expect(ana.getByTestId("provider-info")).toContainText("Samostojni podjetnik (s.p.)");
  await expect(ana.getByTestId("provider-info")).toContainText("Vesna Novak s.p.");
  await expect(ana.getByTestId("payment-deadline")).toContainText("3 dnevi po prijavi");
  await ana.getByLabel("Število oseb").selectOption("2");
  await ana.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(ana.getByTestId("payment-awaiting")).toContainText(nbsp("50,00 €"));
  await expect(ana.getByTestId("payment-awaiting")).toContainText("Plačaj do");
  await expect(ana.getByTestId("payment-confirmed")).toHaveCount(0);
  await checkPage(ana);
  await ana.goto("/moje-aktivnosti");
  await expect(ana.getByTestId("activities-list")).toContainText("Čaka plačilo");

  await bor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await bor.getByRole("link", { name: new RegExp(title) }).click();
  await bor.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(bor.getByTestId("payment-awaiting")).toBeVisible();

  // Organizer: confirm Ana, release Bor.
  await org.goto(manageUrl);
  const attendees = org.getByTestId("attendees");
  await expect(attendees).toContainText("Čaka plačilo");
  await checkPage(org);
  await attendees.getByRole("button", { name: "Potrdi prejem plačila (Obiskovalka Ana)" }).click();
  await expect(attendees.locator("li").filter({ hasText: "Obiskovalka Ana" })).toContainText(
    "Plačilo potrjeno",
  );
  const borRow = attendees.locator("li").filter({ hasText: "Obiskovalec Bor" });
  await borRow.getByText("Sprosti mesto").click();
  await borRow.getByLabel("Razlog (vidi ga udeleženec)").fill("Plačilo ni prispelo do roka");
  await borRow.getByRole("button", { name: "Sprosti rezervacijo" }).click();
  await expect(attendees).not.toContainText("Obiskovalec Bor");

  await org.goto(`/organizator/${spaceSlug}`);
  await expect(org.getByText("Potrjena plačila")).toBeVisible();
  await expect(org.getByText(nbsp("50,00 €"))).toBeVisible();

  // Visitors see the outcome.
  await ana.goto("/obvestila");
  await expect(ana.getByTestId("notifications")).toContainText("Organizator je potrdil prejem plačila");
  await ana.goBack();
  await ana.goto("/moje-aktivnosti");
  await expect(ana.getByTestId("activities-list")).toContainText("Potrjeno");
  await bor.goto("/obvestila");
  await expect(bor.getByTestId("notifications")).toContainText("Plačilo ni prispelo do roka");
});

test("guests see the price of a paid test event but not the payment instructions", async ({ page }) => {
  await page.goto("/dogodki/tkanje-na-statvah");
  await expect(page.getByTestId("price")).toContainText(nbsp("25,00 €"));
  await expect(page.getByTestId("payment-instructions")).toHaveCount(0);
  await expect(page.getByTestId("provider-info")).toContainText("Samostojni podjetnik (s.p.)");
  await expect(page.getByTestId("provider-info")).toContainText("vidijo prijavljeni");
  await checkPage(page);
});

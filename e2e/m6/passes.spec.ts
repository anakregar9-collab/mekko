import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("passes: organizer sells a 3-visit pass, confirms payment, visitor books with it, cancelled session returns the visit", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const ana = await (await browser.newContext()).newPage();
  await signUp(org, "Joginja Petra");
  await signUp(ana, "Vadeča Ana");

  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Joga ${uid("")}`)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));

  // Passes need the legal status first.
  await org.getByRole("link", { name: "Karte" }).first().click();
  await expect(org.getByText("izpolni pravni status organizatorja")).toBeVisible();
  await org.goto(`/organizator/${slug}/nastavitve`);
  const legal = org.getByTestId("legal-form");
  await legal.getByText("Samostojni podjetnik (s.p.)").click();
  await legal.getByLabel("Ime ali naziv ponudnika").fill("Petra Joga s.p.");
  await legal.getByLabel("Naslov").fill("Glavni trg 1, 2000 Maribor");
  await legal.getByLabel("Matična ali davčna številka").fill("1122334");
  await legal.getByLabel("E-pošta za stranke").fill("petra@example.test");
  await legal.getByLabel(/Razumem in potrjujem/).check();
  await legal.getByRole("button", { name: "Shrani pravne podatke" }).click();
  await expect(legal.getByText("Pravni podatki so shranjeni.")).toBeVisible();

  // Pass type with validation
  await org.goto(`/organizator/${slug}/karte`);
  const form = org.getByTestId("pass-type-form");
  await form.getByRole("button", { name: "Dodaj karto" }).click();
  await expect(form.getByText("Vpiši ceno med 0,50 in 5000 €.")).toBeVisible();
  const passName = `3 obiski joge ${uid("")}`;
  await form.getByLabel("Ime karte").fill(passName);
  await form.getByLabel("Število obiskov").fill("3");
  await form.getByLabel("Cena (€)").fill("36");
  await form.getByLabel("Velja dni").fill("60");
  await form.getByLabel("Navodila za plačilo").fill("IBAN SI56 0000 TEST, sklic: ime");
  await form.getByLabel(/Povezava za spletno plačilo/).fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Dodaj karto" }).click();
  await expect(form.getByText("Povezava mora začeti s https://")).toBeVisible();
  await form.getByLabel(/Povezava za spletno plačilo/).fill("https://buy.stripe.com/test_joga");
  await form.getByRole("button", { name: "Dodaj karto" }).click();
  await expect(org.getByText("Karta je dodana")).toBeVisible();
  await expect(org.getByTestId("pass-types")).toContainText(passName);
  await checkPage(org);

  // Event that accepts passes, two sessions
  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Jutranja joga ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(4));
  await org.getByLabel("Kraj", { exact: true }).fill("Maribor");
  await org.getByLabel("Število mest").fill("10");
  await org.getByLabel("Prijava s karto").check();
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();
  const panel = org.getByTestId("sessions-panel");
  await panel.getByText("+ Dodaj termin").click();
  const add = panel.locator("form").last();
  await add.getByLabel("Datum").fill(dateInDays(11));
  await add.getByLabel("Od").fill("08:00");
  await add.getByLabel("Do").fill("09:00");
  await add.getByRole("button", { name: "Dodaj termin" }).click();
  await expect(panel.getByTestId("session")).toHaveCount(2);

  // Visitor buys the pass on the space page
  await ana.goto(`/prostori/${slug}`);
  const card = ana.getByTestId("space-passes").locator("li").filter({ hasText: passName });
  await card.getByRole("button", { name: /Kupi karto/ }).click();
  await expect(card.getByText("Naročeno – čaka na tvoje plačilo")).toBeVisible();
  await expect(card.getByTestId("payment-details")).toContainText("IBAN SI56 0000 TEST");
  await expect(card.getByRole("link", { name: /Plačaj prek povezave organizatorja/ })).toHaveAttribute(
    "href",
    "https://buy.stripe.com/test_joga",
  );
  await checkPage(ana);

  // Not usable before the organizer confirms
  await ana.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await ana.getByRole("link", { name: new RegExp(title) }).click();
  await expect(ana.getByText("Možna prijava s karto").first()).toBeVisible();
  await expect(ana.getByTestId("pass-booking-form")).toHaveCount(0);
  const eventUrl = ana.url();

  // Organizer confirms payment
  await org.goto("/obvestila");
  await expect(org.getByTestId("notifications")).toContainText(`Nov nakup karte: ${passName}`);
  await org.goto(`/organizator/${slug}/karte`);
  await org
    .getByTestId("pass-requests")
    .getByRole("button", { name: /Plačilo prejeto – aktiviraj/ })
    .click();
  await expect(org.getByTestId("active-passes")).toContainText("Vadeča Ana");
  await expect(org.getByTestId("active-passes").getByTestId("pass-usage")).toHaveText("0 / 3 porabljenih");

  // Visitor books 2 persons with the pass
  await ana.goto(eventUrl);
  const pf = ana.getByTestId("pass-booking-form");
  await expect(pf).toBeVisible();
  await pf.getByLabel("Število oseb (s karto)").selectOption("2");
  await pf.getByRole("button", { name: "Prijavi se s karto" }).click();
  await expect(ana.getByTestId("my-booking")).toBeVisible();
  await ana.goto("/moj-mekko/karte");
  await expect(ana.getByTestId("pass-left")).toContainText("Ostane 1 obisk");
  await checkPage(ana);

  // Organizer sees the pass badge, then cancels that session → visits come back
  await org.goto(manageUrl);
  await expect(org.getByTestId("attendees")).toContainText("Karta");
  const first = org.getByTestId("session").first();
  await first.getByText("Odpovej termin").click();
  await first.getByLabel("Razlog (vidijo ga prijavljeni)").fill("Bolezen");
  await first.getByRole("button", { name: "Odpovej ta termin" }).click();
  await expect(org.getByTestId("session").first()).toContainText("(odpovedan)");
  await ana.goto("/moj-mekko/karte");
  await expect(ana.getByTestId("pass-left")).toContainText("Ostane 3 obiski");

  // Payments overview counts the pass
  await org.goto(`/organizator/${slug}/placila`);
  const total = org
    .getByTestId("payment-stats")
    .locator("div")
    .filter({ hasText: "Potrjeno skupaj" })
    .first();
  await expect(total).toContainText("36,00");
});

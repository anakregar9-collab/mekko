import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

test("recorded course: preview for everyone, paid lessons unlock after the organizer confirms payment", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const ana = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  await signUp(org, "Učiteljica Akvarela");
  await signUp(ana, "Učenka Tina");

  await org.goto(
    `/organizator/nov-prostor?vrsta=solo_creator&ime=${encodeURIComponent(`Akvarel ${uid("")}`)}`,
  );
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await org.goto(`/organizator/${slug}/nastavitve`);
  const legal = org.getByTestId("legal-form");
  await legal.getByText("Samostojni podjetnik (s.p.)").click();
  await legal.getByLabel("Ime ali naziv ponudnika").fill("Mojca Barvna s.p.");
  await legal.getByLabel("Naslov").fill("Cankarjeva 3, 1000 Ljubljana");
  await legal.getByLabel("Matična ali davčna številka").fill("99887766");
  await legal.getByLabel("E-pošta za stranke").fill("mojca@example.test");
  await legal.getByLabel(/Razumem in potrjujem/).check();
  await legal.getByRole("button", { name: "Shrani pravne podatke" }).click();
  await expect(legal.getByText("Pravni podatki so shranjeni.")).toBeVisible();

  // Create a paid course
  await org.getByRole("link", { name: "Tečaji" }).first().click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}/tecaji$`));
  const form = org.getByTestId("course-form");
  const title = `Akvarel za začetnike ${uid("")}`;
  await form.getByLabel("Naslov tečaja").fill(title);
  await form.getByLabel("Kratek opis").fill("Od prvega poteza do cveta.");
  await form.getByLabel("Plačljiv tečaj").check();
  await form.getByRole("button", { name: "Ustvari tečaj" }).click();
  await expect(form.getByText("Vpiši ceno med 0,50 in 5000 €.")).toBeVisible();
  await form.getByLabel("Cena (€)").fill("29");
  await form.getByLabel("Navodila za plačilo").fill("IBAN SI56 1111 TEST, sklic: tečaj");
  await form.getByRole("button", { name: "Ustvari tečaj" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}/tecaji/[0-9a-f-]{36}$`));
  const manageUrl = org.url();

  // Publishing needs a lesson with a video
  await org.getByRole("button", { name: "Objavi tečaj" }).click();
  await expect(org.getByText("Za objavo dodaj vsaj eno lekcijo z videom.")).toBeVisible();

  const lesson = org.getByTestId("lesson-form");
  await lesson.getByLabel("Naslov lekcije").fill("Uvod in pripomočki");
  await lesson.getByLabel("YouTube povezava").fill("https://vimeo.com/123");
  await lesson.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(lesson.getByText(/Prilepi povezavo do YouTube videa/)).toBeVisible();
  await lesson.getByLabel("YouTube povezava").fill("https://youtu.be/dQw4w9WgXcQ");
  await lesson.getByLabel("Brezplačen predogled").check();
  await lesson.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(org.getByTestId("lesson-list")).toContainText("Uvod in pripomočki");
  await lesson.getByLabel("Naslov lekcije").fill("Mešanje barv");
  await lesson.getByLabel("YouTube povezava").fill("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  await lesson.getByLabel("Zapiski (neobvezno)").fill("Skrivnost: vedno najprej voda.");
  await lesson.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(org.getByTestId("lesson-list").locator("li")).toHaveCount(2);
  await org.getByRole("button", { name: "Objavi tečaj" }).click();
  await expect(org.getByText("Tečaj je objavljen.")).toBeVisible();
  await checkPage(org);

  // Guest: outline + free preview, locked second lesson, no notes
  await guest.goto(`/prostori/${slug}`);
  await guest
    .getByTestId("space-courses")
    .getByRole("link", { name: new RegExp(title) })
    .click();
  await expect(guest.getByTestId("course-outline").locator("li")).toHaveCount(2);
  await expect(guest.getByTestId("lesson-player").locator("iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
  );
  await expect(guest.getByTestId("course-outline").getByRole("link")).toHaveCount(1);
  await expect(guest.getByText("Skrivnost: vedno najprej voda.")).toHaveCount(0);
  await checkPage(guest);
  const courseUrl = guest.url().split("?")[0];

  // Buyer: order → payment details, still locked
  await ana.goto(courseUrl);
  await ana.getByRole("button", { name: "Kupi tečaj" }).click();
  await expect(ana.getByTestId("course-access")).toContainText("Naročeno");
  await expect(ana.getByTestId("payment-details")).toContainText("IBAN SI56 1111 TEST");
  await expect(ana.getByTestId("course-outline").getByRole("link")).toHaveCount(1);

  // Organizer confirms
  await org.goto("/obvestila");
  await expect(org.getByTestId("notifications")).toContainText(`Nov nakup tečaja: ${title}`);
  await org.goto(manageUrl);
  await org
    .getByTestId("course-requests")
    .getByRole("button", { name: /Plačilo prejeto – odkleni/ })
    .click();
  await expect(org.getByTestId("course-learners")).toContainText("Učenka Tina");

  // Buyer: all lessons, notes, progress
  await ana.goto(courseUrl);
  await expect(ana.getByTestId("course-outline").getByRole("link")).toHaveCount(2);
  await ana
    .getByTestId("course-outline")
    .getByRole("link", { name: /Mešanje barv/ })
    .click();
  await expect(ana.getByText("Skrivnost: vedno najprej voda.")).toBeVisible();
  await ana.getByRole("button", { name: "Označi kot opravljeno" }).click();
  await expect(ana.getByRole("button", { name: "Opravljeno" })).toBeVisible();
  await expect(ana.getByTestId("course-access")).toContainText("opravljenih 1 od 2");
  await ana.goto("/moj-mekko/tecaji");
  await expect(ana.getByTestId("my-courses")).toContainText("Opravljenih 1 od 2 lekcij");
  await checkPage(ana);
});

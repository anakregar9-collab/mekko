import { expect, test } from "@playwright/test";
import { checkPage, login, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("account deletion: owners must hand over spaces; members delete, are hidden, can restore within 30 days", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const ana = await (await browser.newContext()).newPage();
  await signUp(org, "Lastnica Prostora");
  const { email } = await signUp(ana, "Ana Odhajam");

  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Izbris ${uid("")}`)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Dogodek pred izbrisom ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(7));
  await org.getByLabel("Kraj", { exact: true }).fill("Kranj");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  const manageUrl = org.url();

  // Owner cannot delete while owning a space
  await org.goto("/moj-mekko/podatki");
  await expect(org.getByTestId("delete-account-form")).toContainText("Imaš v lasti prostore");
  await expect(org.getByRole("button", { name: "Izbriši moj račun" })).toHaveCount(0);

  // Ana books, then deletes her account
  await ana.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await ana.getByRole("link", { name: new RegExp(title) }).click();
  await ana.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(ana.getByTestId("my-booking")).toBeVisible();
  await ana.goto("/moj-mekko/podatki");
  await checkPage(ana);
  const form = ana.getByTestId("delete-account-form");
  await form.getByLabel("Za potrditev vpiši IZBRIŠI").fill("ne");
  await form.getByRole("button", { name: "Izbriši moj račun" }).click();
  await expect(form.getByText("Za potrditev vpiši IZBRIŠI.")).toBeVisible();
  await form.getByLabel("Za potrditev vpiši IZBRIŠI").fill("IZBRIŠI");
  await form.getByRole("button", { name: "Izbriši moj račun" }).click();
  await expect(ana).toHaveURL(/\/prijava\?izbris=1/);
  await expect(ana.getByTestId("deletion-requested")).toContainText("30 dni");

  // Her booking is released
  await org.goto(manageUrl);
  await expect(org.getByTestId("attendees")).not.toContainText("Ana Odhajam");

  // She signs in again within 30 days and restores the account
  await login(ana, email, undefined, "/prijava?naprej=%2Fmoj-mekko");
  await expect(ana).toHaveURL(/\/racun-omejen/);
  await expect(ana.getByTestId("deletion-pending")).toContainText("Račun je v izbrisu");
  await checkPage(ana);
  await ana.getByRole("button", { name: "Prekliči izbris in obnovi račun" }).click();
  await expect(ana).toHaveURL(/\/moj-mekko\?obnovljen=1$/);
  await expect(ana.getByTestId("my-profile")).toContainText("Ana Odhajam");
});

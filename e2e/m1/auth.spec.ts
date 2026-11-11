import { expect, test } from "@playwright/test";
import { checkPage, latestCode, login, signUp, uid } from "../helpers";

test.describe("guest", () => {
  test("protected pages redirect to login and keep the destination", async ({ page }) => {
    for (const path of ["/moj-mekko", "/moje-aktivnosti", "/organizator", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/prijava\\?naprej=${encodeURIComponent(path).replace(/%/g, "%")}`),
      );
    }
    await checkPage(page);
  });

  test("Odkrivanje is public and the shell has 4 tabs + 2 header icons", async ({ page }) => {
    await page.goto("/odkrivanje");
    await expect(page.getByRole("heading", { name: "Odkrivanje" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Glavna navigacija" });
    await expect(nav.getByRole("list").getByRole("link")).toHaveText([
      "Odkrivanje",
      "Moje aktivnosti",
      "Ustvari",
      "Moj Mekko",
    ]);
    await expect(page.getByTestId("header-messages")).toHaveAttribute("href", "/sporocila");
    await expect(page.getByTestId("header-notifications")).toHaveAttribute("href", "/obvestila");
    await checkPage(page);
  });

  test("open redirects via ?naprej are ignored", async ({ page }) => {
    const email = `${uid("r")}@example.test`;
    await login(page, email, "/prijava?naprej=//evil.example");
    await expect(page).toHaveURL(/\/onboarding\?naprej=%2Fmoj-mekko/);
  });
});

test("sign-up, onboarding, profile privacy and data request", async ({ page }) => {
  const handle = uid("n").toLowerCase();
  const email = `${handle}@example.test`;

  await page.goto("/prijava");
  await checkPage(page);
  await page.getByLabel("E-pošta").fill("ni-email");
  await page.getByRole("button", { name: "Pošlji kodo" }).click();
  await expect(page.getByText("Vpiši veljaven e-poštni naslov.")).toBeVisible();

  await page.getByLabel("E-pošta").fill(email);
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Pošlji kodo" }).click();
  await page.getByLabel("Koda iz e-pošte").fill("000000");
  await page.getByRole("button", { name: "Prijava" }).click();
  await expect(page.getByText("Koda ni pravilna ali je potekla.")).toBeVisible();
  await page.getByLabel("Koda iz e-pošte").fill(await latestCode(email, sentAt));
  await page.getByRole("button", { name: "Prijava" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await checkPage(page);
  await page.getByLabel("Ime, ki ga vidijo drugi").fill("Nina Test");
  await page.getByRole("textbox", { name: "Uporabniško ime" }).fill("Ni!");
  await page.getByRole("button", { name: "Nadaljuj" }).click();
  await expect(page.getByText("3–30 znakov")).toBeVisible();

  await page.getByRole("textbox", { name: "Uporabniško ime" }).fill(handle);
  await page
    .locator("label")
    .filter({ hasText: /^Keramika$/, visible: true })
    .click();
  await expect(page.getByRole("checkbox", { name: "Keramika" })).toBeChecked();
  await page.getByRole("checkbox", { name: /Uporabi moj približni kraj/ }).check();
  await page.getByLabel("Kraj", { exact: true }).fill("Celje");
  await page.getByRole("radio", { name: /^Samo prijavljenim/ }).check();
  await page.getByRole("button", { name: "Nadaljuj" }).click();

  await expect(page).toHaveURL(/\/moj-mekko$/);
  const card = page.getByTestId("my-profile");
  await expect(card).toContainText("Nina Test");
  await expect(card).toContainText(`@${handle} · Celje`);
  await checkPage(page);

  // Privacy: switch to private and withdraw location consent.
  await page.getByRole("link", { name: /Profil in zasebnost/ }).click();
  await page.getByRole("radio", { name: /^Zaseben/ }).check();
  await page.getByRole("checkbox", { name: /Uporabi moj približni kraj/ }).uncheck();
  await page.getByRole("button", { name: "Shrani" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Shranjeno." })).toBeVisible();
  await checkPage(page);
  await page.goto("/moj-mekko");
  await expect(card).toContainText("Zaseben profil");
  await expect(card).not.toContainText("Celje");

  // GDPR export request.
  await page.getByRole("link", { name: /Moji podatki/ }).click();
  await page.getByRole("button", { name: "Zahtevaj izvoz" }).click();
  await expect(page.getByText("Zahteva za izvoz je oddana.")).toBeVisible();
  await expect(page.getByTestId("my-data-requests")).toContainText("Izvoz podatkov");
  await checkPage(page);

  // Sign out.
  await page.goto("/moj-mekko");
  await page.getByRole("button", { name: "Odjava" }).click();
  await expect(page).toHaveURL(/\/prijava\?odjava=1/);
  await page.goto("/moj-mekko");
  await expect(page).toHaveURL(/\/prijava/);
});

test("handles are unique across users", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const { handle } = await signUp(a, "Prva Oseba");
  const b = await (await browser.newContext()).newPage();
  await login(b, `${uid("d")}@example.test`);
  await b.getByLabel("Ime, ki ga vidijo drugi").fill("Druga Oseba");
  await b.getByRole("textbox", { name: "Uporabniško ime" }).fill(handle);
  await b.getByRole("button", { name: "Nadaljuj" }).click();
  await expect(b.getByText("To uporabniško ime je že zasedeno.").first()).toBeVisible();
});

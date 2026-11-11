import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

test("owner creates a space, invites an admin, demotes to staff; outsiders are locked out", async ({
  browser,
}) => {
  const owner = await (await browser.newContext()).newPage();
  const helper = await (await browser.newContext()).newPage();
  const outsider = await (await browser.newContext()).newPage();
  await signUp(owner, "Lastnica Ana");
  const { handle: helperHandle } = await signUp(helper, "Pomočnik Bor");
  await signUp(outsider, "Tuja Oseba");

  // Owner: quick "solo creator" path from organizer home.
  await owner.goto("/moj-mekko");
  await owner.getByTestId("switch-organizer").click();
  await expect(owner).toHaveURL(/\/organizator$/);
  await checkPage(owner);
  await owner.getByRole("link", { name: "Začni kot ustvarjalec" }).click();
  await checkPage(owner);
  await expect(owner.getByLabel("Ustvarjalec")).toBeChecked();
  const name = `Glinena hiša ${uid("")}`;
  await owner.getByLabel("Ime prostora").fill(name);
  const slug = await owner.getByLabel("Spletni naslov").inputValue();
  expect(slug).toMatch(/^glinena-hisa-/);
  await owner.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(owner).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await expect(owner.getByRole("heading", { name })).toBeVisible();
  await expect(owner.getByText("Tvoja vloga: Lastnik")).toBeVisible();
  await checkPage(owner);

  // Settings.
  await owner.getByRole("link", { name: "Nastavitve prostora" }).click();
  await owner.getByLabel("Kratek opis", { exact: true }).fill("Keramika za vse");
  await owner.getByRole("button", { name: "Shrani" }).click();
  await expect(owner.getByText("Nastavitve so shranjene.")).toBeVisible();
  await checkPage(owner);

  // Invite helper as admin.
  await owner.getByRole("link", { name: "Ekipa" }).click();
  await owner.getByRole("textbox", { name: "Uporabniško ime" }).fill(`@${helperHandle}`);
  await owner.getByLabel("Vloga").selectOption("admin");
  await owner.getByRole("button", { name: "Pošlji povabilo" }).click();
  await expect(owner.getByText(`Povabilo je poslano osebi @${helperHandle}`)).toBeVisible();
  await expect(owner.getByTestId("team-list")).toContainText("Povabljen/-a");
  await checkPage(owner);

  // Helper cannot enter before accepting.
  await helper.goto(`/organizator/${slug}`);
  await expect(helper.getByText("Strani ni bilo mogoče najti")).toBeVisible();
  await helper.goto("/organizator");
  await expect(helper.getByTestId("invites")).toContainText(name);
  await helper.getByRole("button", { name: "Sprejmi" }).click();
  await expect(helper.getByTestId("my-spaces")).toContainText(name);
  await helper.goto(`/organizator/${slug}/nastavitve`);
  await expect(helper.getByLabel("Ime prostora")).toHaveValue(name);

  // Admin cannot invite another admin (option not offered) — only staff.
  await helper.goto(`/organizator/${slug}/ekipa`);
  await expect(helper.getByLabel("Vloga").locator("option")).toHaveText(["Sodelavec"]);

  // Owner demotes helper to staff → settings now 404 for helper.
  await owner.reload();
  await owner.getByRole("button", { name: "Naredi sodelavca" }).click();
  await expect(owner.getByText("Vloga je spremenjena.")).toBeVisible();
  await helper.goto(`/organizator/${slug}/nastavitve`);
  await expect(helper.getByText("Strani ni bilo mogoče najti")).toBeVisible();
  await helper.goto(`/organizator/${slug}`);
  await expect(helper.getByText("Tvoja vloga: Sodelavec")).toBeVisible();

  // Outsider: every space page is a 404.
  for (const p of ["", "/ekipa", "/nastavitve"]) {
    await outsider.goto(`/organizator/${slug}${p}`);
    await expect(outsider.getByText("Strani ni bilo mogoče najti")).toBeVisible();
  }
});

test("space form validates slug and kind", async ({ page }) => {
  await signUp(page, "Validacija");
  await page.goto("/organizator/nov-prostor");
  await page.getByLabel("Ime prostora").fill("X");
  await page.getByLabel("Spletni naslov").fill("nov-prostor");
  await page.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(page.getByText("Izberi vrsto prostora.")).toBeVisible();
  await expect(page.getByText("Vsaj 2 znaka.")).toBeVisible();
  await expect(page.getByText("Ta naslov je rezerviran.")).toBeVisible();
  await checkPage(page);
});

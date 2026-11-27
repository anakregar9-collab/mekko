import { expect, test } from "@playwright/test";
import { checkPage, grantPlatformRole, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("admin: search, person and space detail, suspend and restore a space", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  await signUp(org, "Sumljivi Studio Lastnik");
  await signUp(visitor, "Radovedna Obiskovalka");
  const { handle } = await signUp(admin, "Glavna Administratorka");
  await grantPlatformRole(handle, "admin");

  const name = `Studio za blokado ${uid("")}`;
  await org.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(name)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Dogodek za blokado ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(6));
  await org.getByLabel("Kraj", { exact: true }).fill("Koper");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();

  // Dashboard search finds the space
  await admin.goto("/admin");
  await checkPage(admin);
  await admin.getByLabel("Išči osebo ali prostor").fill(name.split(" ").pop()!);
  await admin.getByRole("button", { name: "Išči" }).click();
  await admin
    .getByTestId("admin-search-results")
    .getByRole("link", { name: new RegExp(name) })
    .click();
  await expect(admin.getByRole("heading", { name })).toBeVisible();
  await expect(admin.getByTestId("space-overview")).toContainText("Objavljeni dogodki");
  await checkPage(admin);

  // Suspend
  const form = admin.getByTestId("suspend-space-form");
  await form.getByLabel(/Razlog za blokado/).fill("Zavajajoče ponudbe, preverjamo.");
  await form.getByRole("button", { name: /Blokiraj prostor/ }).click();
  await expect(admin.getByTestId("space-suspended")).toContainText("Zavajajoče ponudbe");

  // Public cannot see the space or its event
  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await expect(visitor.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  await visitor.goto(`/prostori/${slug}`);
  await expect(visitor.getByText("Strani ni bilo mogoče najti")).toBeVisible();

  // Owner sees why
  await org.goto(`/organizator/${slug}`);
  await expect(org.getByTestId("space-suspended-notice")).toContainText("Zavajajoče ponudbe");
  await org.goto("/obvestila");
  await expect(org.getByTestId("notifications")).toContainText(`Prostor je blokiran: ${name}`);

  // Owner detail page shows the person; then restore
  await admin.getByRole("link", { name: /Sumljivi Studio Lastnik/ }).click();
  await expect(admin.getByTestId("user-overview")).toContainText("Prijave na dogodke");
  await expect(admin.getByText(/@example\.test/)).toBeVisible();
  await checkPage(admin);
  await admin.goBack();
  await admin.getByLabel(/Razlog za ponovno aktivacijo/).fill("Preverjeno, v redu.");
  await admin.getByRole("button", { name: /Odblokiraj prostor/ }).click();
  await expect(admin.getByTestId("space-suspended")).toHaveCount(0);
  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await expect(visitor.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});

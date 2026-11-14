import { expect, test } from "@playwright/test";
import { checkPage, grantPlatformRole, signUp } from "../helpers";

test("admin area: hidden from users; admin suspends with reason, audited; suspended user is restricted", async ({
  browser,
}) => {
  const admin = await (await browser.newContext()).newPage();
  const user = await (await browser.newContext()).newPage();
  const { handle: adminHandle } = await signUp(admin, "Skrbnica Platforme");
  const { handle: userHandle } = await signUp(user, "Navaden Uporabnik");

  // Not staff → 404, and no admin link in Moj Mekko.
  await admin.goto("/admin");
  await expect(admin.getByText("Strani ni bilo mogoče najti")).toBeVisible();

  await grantPlatformRole(adminHandle, "admin");
  await admin.goto("/moj-mekko");
  await admin.getByRole("link", { name: /Administracija/ }).click();
  await expect(admin.getByRole("heading", { name: "Administracija" })).toBeVisible();
  await checkPage(admin);

  // User files a deletion request; admin sees it.
  await user.goto("/moj-mekko/podatki");
  await user.getByRole("checkbox", { name: "Razumem, da izbrisa ni mogoče razveljaviti." }).check();
  await user.getByRole("button", { name: "Zahtevaj izbris" }).click();
  await expect(user.getByText("Zahteva za izbris je oddana.")).toBeVisible();

  await admin.getByRole("link", { name: "Zahteve GDPR" }).click();
  const req = admin
    .getByTestId("admin-requests")
    .getByRole("listitem")
    .filter({ hasText: `@${userHandle}` });
  await expect(req).toContainText("Izbris");
  await checkPage(admin);
  await req.getByLabel("Opomba").fill("Preverjeno, v obdelavi");
  await req.getByRole("button", { name: "V obdelavo" }).click();
  await expect(req).toContainText("V obdelavi");

  // Suspend: reason is required.
  await admin.getByRole("link", { name: "Uporabniki" }).click();
  await admin.getByLabel("Išči po imenu ali uporabniškem imenu").fill(userHandle);
  await admin.getByRole("button", { name: "Išči" }).click();
  const row = admin
    .getByTestId("admin-users")
    .getByRole("listitem")
    .filter({ hasText: `@${userHandle}` });
  await checkPage(admin);
  await row.getByRole("button", { name: "Omeji račun" }).click();
  await expect(row.getByText("Vpiši razlog")).toBeVisible();
  await row.getByLabel(`Razlog za @${userHandle}`).fill("Testna omejitev");
  await row.getByRole("button", { name: "Omeji račun" }).click();
  await expect(row.getByText("Omejen", { exact: true })).toBeVisible();

  await admin.getByRole("link", { name: "Revizijska sled" }).click();
  await expect(admin.getByTestId("audit-log")).toContainText("Testna omejitev");
  await expect(admin.getByTestId("audit-log")).toContainText(`@${adminHandle}`);
  await checkPage(admin);

  // Suspended user can no longer use the app.
  await user.goto("/moj-mekko");
  await expect(user).toHaveURL(/\/racun-omejen/);
  await user.goto("/organizator/nov-prostor");
  await expect(user).toHaveURL(/\/racun-omejen/);
});

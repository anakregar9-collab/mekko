import { expect, test } from "@playwright/test";
import { signUp, uid } from "../helpers";

// Development milestones (M1, M2 …) are internal and must never appear in the live app.
test("live pages show no internal milestone labels", async ({ page }) => {
  await signUp(page, "Preverjalka Oznak");
  await page.goto(`/organizator/nov-prostor?vrsta=studio&ime=${encodeURIComponent(`Oznake ${uid("")}`)}`);
  const slug = await page.getByLabel("Spletni naslov").inputValue();
  await page.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(page).toHaveURL(new RegExp(`/organizator/${slug}$`));

  for (const path of [
    "/odkrivanje",
    "/moj-mekko",
    "/ustvari",
    "/moje-aktivnosti",
    "/sporocila",
    `/organizator/${slug}`,
    `/organizator/${slug}/dogodki`,
    `/organizator/${slug}/nastavitve`,
    "/dogodki/tkanje-na-statvah",
  ]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text, `${path} must not show milestone labels`).not.toMatch(/\bM[0-9]\b/);
  }
});

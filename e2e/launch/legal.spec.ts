import { expect, test } from "@playwright/test";
import { checkPage, serviceClient, signUp } from "../helpers";

test("guests can read the terms and privacy policy (marked as draft)", async ({ page }) => {
  for (const [path, title] of [
    ["/pogoji", "Pogoji uporabe"],
    ["/zasebnost", "Politika zasebnosti"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByTestId("legal-draft")).toContainText("Osnutek v pregledu pri pravniku");
    await checkPage(page);
  }
  await page.goto("/prijava");
  await expect(page.getByRole("link", { name: "Pogoji uporabe" })).toHaveAttribute("href", "/pogoji");
});

test("existing users accept a new version of the terms before continuing", async ({ page }) => {
  const { handle } = await signUp(page, "Stara Uporabnica");
  // Simulate an account that accepted an older version (or none).
  const { error } = await serviceClient()
    .from("profiles")
    .update({ terms_version: null })
    .eq("handle", handle);
  expect(error).toBeNull();

  await page.goto("/moje-aktivnosti");
  await expect(page).toHaveURL(/\/pogoji-potrditev/);
  await checkPage(page);
  await page.getByRole("button", { name: "Potrdi in nadaljuj" }).click();
  await expect(page.getByText("Za nadaljevanje sprejmi Pogoje uporabe.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Sprejemam Pogoje uporabe/ }).check();
  await page.getByRole("button", { name: "Potrdi in nadaljuj" }).click();
  await expect(page).toHaveURL(/\/moje-aktivnosti$/);
});

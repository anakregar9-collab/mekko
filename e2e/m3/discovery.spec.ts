import { expect, test } from "@playwright/test";
import { checkPage } from "../helpers";

test("Odkrivanje: Dogodki/Ideje tabs share categories; quick filters narrow the feed", async ({ page }) => {
  await page.goto("/odkrivanje");
  await expect(page.getByTestId("tab-dogodki")).toHaveAttribute("aria-current", "page");
  const cats = page.getByRole("navigation", { name: "Kategorije" });
  await expect(cats.getByRole("link", { name: "Keramika in kiparstvo" })).toBeVisible();
  await expect(cats.getByRole("link")).toHaveCount(10); // "Vse" + 9 categories
  await checkPage(page);

  const feed = page.getByTestId("feed");
  const quick = page.getByRole("navigation", { name: "Hitri filtri" });

  await quick.getByRole("button", { name: "Online" }).click();
  await expect(page).toHaveURL(/f=online/);
  await expect(feed).toContainText("Online: osnove kaligrafije");
  await expect(feed).not.toContainText("Keramika za začetnike");
  await quick.getByRole("button", { name: "Online" }).click();
  await expect(page).not.toHaveURL(/f=online/);

  await quick.getByRole("button", { name: "Za otroke" }).click();
  await expect(page).toHaveURL(/f=otroci/);
  await expect(feed).toContainText("Jutranja joga na Krasu");
  await expect(feed).not.toContainText("Keramika za začetnike");
  await quick.getByRole("button", { name: "Za otroke" }).click();
  await expect(page).not.toHaveURL(/f=otroci/);

  await quick.getByRole("button", { name: "Za začetnike" }).click();
  await expect(page).toHaveURL(/f=zacetniki/);
  await expect(feed).toContainText("Keramika za začetnike");
  await expect(feed).not.toContainText("Jutranja joga na Krasu");
  await expect(feed).not.toContainText("Vretenje – nadaljevalni tečaj");
  await checkPage(page);

  // Filters stay when switching to Ideje; same categories there.
  await page.getByTestId("tab-ideje").click();
  await expect(page).toHaveURL(/pogled=ideje/);
  await expect(page).toHaveURL(/f=zacetniki/);
  await expect(page.getByTestId("ideas-feed")).toContainText("Akvarelne voščilnice");
  await expect(cats.getByRole("link")).toHaveCount(10);
  // Event-only filters are not offered for ideas.
  await expect(quick.getByRole("button", { name: "Ta vikend" })).toHaveCount(0);
  await checkPage(page);
});

test("event page shows audience badges", async ({ page }) => {
  await page.goto("/dogodki/jutranja-joga-na-krasu");
  await expect(page.getByText("Za otroke in družine").filter({ visible: true }).first()).toBeVisible();
});

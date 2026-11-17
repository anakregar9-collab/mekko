import { expect, test, type Page } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);

async function addPhotos(page: Page, n: number) {
  // Next keeps earlier route copies hidden in the DOM; target the visible picker.
  await page
    .locator('input[type="file"][accept]')
    .filter({ visible: true })
    .first()
    .setInputFiles(
      Array.from({ length: n }, (_, i) => ({ name: `izdelek-${i}.png`, mimeType: "image/png", buffer: PNG })),
    );
  await expect(page.getByTestId("photo-previews").filter({ visible: true }).locator("li")).toHaveCount(n);
}

test("post with photos, follow, like, comment, share to a friend; followers-only stays private", async ({
  browser,
}) => {
  const ana = await (await browser.newContext()).newPage();
  const bor = await (await browser.newContext()).newPage();
  const { handle: anaHandle } = await signUp(ana, "Ustvarjalka Ana");
  const caption = `Moja prva skodelica ${uid("")}`;
  const privateCaption = `Samo za sledilce ${uid("")}`;
  await signUp(bor, "Bralec Bor");

  // The Feed tab replaced Sporočila; messages are back in the header.
  await ana.getByTestId("tab-feed").click();
  await expect(ana).toHaveURL(/\/feed$/);
  await expect(ana.getByTestId("header-messages")).toBeVisible();
  await checkPage(ana);

  // Validation: photos + no-children confirmation are required.
  await ana.getByRole("link", { name: "Nova objava" }).click();
  await ana.getByRole("button", { name: "Objavi" }).click();
  await expect(ana.getByText("Dodaj vsaj eno fotografijo (največ 5).")).toBeVisible();
  await expect(ana.getByText("Potrdi, da na fotografijah ni prepoznavnih otrok.")).toBeVisible();

  await addPhotos(ana, 2);
  await ana.getByRole("textbox", { name: "Opis (neobvezno)" }).fill(caption);
  await ana.getByLabel(/Na fotografijah ni prepoznavnih otrok/).check();
  await checkPage(ana);
  await ana.getByRole("button", { name: "Objavi" }).click();
  await expect(ana).toHaveURL(/\/objave\/[0-9a-f-]{36}$/);
  await expect(ana.getByTestId("post").locator("img")).toHaveCount(2);
  const postUrl = ana.url();

  // A followers-only post.
  await ana.goto("/objave/nova");
  await addPhotos(ana, 1);
  await ana.getByRole("textbox", { name: "Opis (neobvezno)" }).fill(privateCaption);
  await ana.getByLabel("Samo moji sledilci").check();
  await ana.getByLabel(/Na fotografijah ni prepoznavnih otrok/).check();
  await ana.getByRole("button", { name: "Objavi" }).click();
  await expect(ana).toHaveURL(/\/objave\//);

  // Bor finds Ana in Navdih (public post only), follows her, then sees both.
  await bor.goto("/feed?pogled=navdih");
  const card = bor.getByTestId("feed-posts").locator("li").filter({ hasText: caption });
  await expect(card).toBeVisible();
  await expect(bor.getByTestId("feed-posts")).not.toContainText(privateCaption);
  await card.getByRole("link", { name: /Ustvarjalka Ana/ }).click();
  await expect(bor).toHaveURL(new RegExp(`/u/${anaHandle}$`));
  await checkPage(bor);
  await bor.getByRole("button", { name: "Sledi" }).click();
  await expect(bor.getByRole("button", { name: "Slediš ✓" })).toBeVisible();
  await bor.goto("/feed");
  await expect(bor.getByTestId("feed-posts")).toContainText(privateCaption);

  // Like + comment.
  await bor.goto(postUrl);
  await bor.getByRole("button", { name: /Všečkaj/ }).click();
  await expect(bor.getByRole("button", { name: /Odstrani všeček/ })).toContainText("1");
  await bor.getByLabel("Napiši komentar").fill("Prečudovita! Kje si kupila glino?");
  await bor.getByRole("button", { name: "Komentiraj" }).click();
  await expect(bor.getByTestId("comments")).toContainText("Prečudovita!");
  await checkPage(bor);

  // Share to Ana via private message (Bor follows Ana, she organizes nothing → established-follow path).
  await bor.goto(`${postUrl}/deli`);
  await expect(bor.getByTestId("share-list")).toContainText("Ustvarjalka Ana");
});

test("guests cannot open the feed", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/prijava/);
});

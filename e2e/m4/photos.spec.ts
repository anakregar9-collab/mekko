import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

// 2×2 red PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);

async function fillIdea(page: import("@playwright/test").Page, title: string) {
  await page.goto("/ustvari/ideja");
  await page.getByLabel("Naslov ideje").fill(title);
  await page.getByLabel("Kategorija").selectOption({ label: "Ročna dela in tekstil" });
  await page.getByLabel("Navodila").fill("1. Pripravi material.\n2. Sledi korakom.\n3. Uživaj v izdelku.");
}

test("idea with a photo shows the photo; a renamed non-image is rejected", async ({ page }) => {
  await signUp(page, "Fotografinja Zala");

  // Fake "photo": text file pretending to be a JPEG.
  await fillIdea(page, `Ponaredek ${uid("")}`);
  await page.getByLabel("Fotografija (neobvezno)").setInputFiles({
    name: "slika.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("to ni slika, samo besedilo"),
  });
  await page.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(page.getByText("Dovoljene so samo fotografije JPG, PNG ali WebP.")).toBeVisible();
  await expect(page).toHaveURL(/\/ustvari\/ideja$/);

  // Real photo.
  const title = `Vezenje ${uid("")}`;
  await fillIdea(page, title);
  await page
    .getByLabel("Fotografija (neobvezno)")
    .setInputFiles({ name: "vezenje.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText("Predogled izbrane fotografije")).toBeVisible();
  await page.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(page).toHaveURL(/\/ideje\//);
  const img = page.getByAltText(`Fotografija ideje ${title}`);
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/covers\/[0-9a-f-]{36}\/[a-z0-9]+\.png$/,
  );
  const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
  expect(loaded, "photo is served from storage").toBe(true);
  await checkPage(page);

  // The card in Odkrivanje shows the photo too.
  await page.goto(`/odkrivanje?pogled=ideje&q=${encodeURIComponent(title)}`);
  await expect(page.getByTestId("ideas-feed").locator("img")).toHaveCount(1);
});

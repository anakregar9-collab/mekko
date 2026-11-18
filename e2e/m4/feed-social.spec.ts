import { expect, test } from "@playwright/test";
import { checkPage, serviceClient, signUp, uid } from "../helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);

test("search people, follow, like and comment create notifications for the author", async ({ browser }) => {
  const ana = await (await browser.newContext()).newPage();
  const bor = await (await browser.newContext()).newPage();
  const name = `Keramičarka ${uid("")}`;
  await signUp(ana, name);
  await signUp(bor, "Bralec Bor");

  await ana.goto("/objave/nova");
  await ana
    .locator('input[type="file"][accept]')
    .filter({ visible: true })
    .first()
    .setInputFiles({ name: "skleda.png", mimeType: "image/png", buffer: PNG });
  await ana.getByRole("textbox", { name: "Opis (neobvezno)" }).fill("Nova skleda");
  await ana.getByLabel(/Na fotografijah ni prepoznavnih otrok/).check();
  await ana.getByRole("button", { name: "Objavi" }).click();
  await expect(ana).toHaveURL(/\/objave\/[0-9a-f-]{36}$/);
  const postUrl = ana.url();

  // Bor finds Ana by name and follows her from the results.
  await bor.goto("/feed");
  await bor.getByRole("link", { name: "Poišči ljudi" }).click();
  await bor.getByLabel("Ime ali uporabniško ime").fill(name);
  await bor.getByLabel("Ime ali uporabniško ime").press("Enter");
  const row = bor.getByTestId("people").locator("li").filter({ hasText: name });
  await expect(row).toBeVisible();
  await checkPage(bor);
  await row.getByRole("button", { name: /Sledi/ }).click();
  await expect(row.getByRole("button", { name: /Slediš/ })).toBeVisible();

  await bor.goto(postUrl);
  await bor.getByRole("button", { name: /Všečkaj/ }).click();
  await expect(bor.getByRole("button", { name: /Odstrani všeček/ })).toBeVisible();
  await bor.getByLabel("Napiši komentar").fill("Krasna barva!");
  await bor.getByRole("button", { name: "Komentiraj" }).click();
  await expect(bor.getByTestId("comments")).toContainText("Krasna barva!");

  await ana.goto("/obvestila");
  const notes = ana.getByTestId("notifications");
  await expect(notes).toContainText("Bralec Bor ti sledi");
  await expect(notes).toContainText("Nov všeček");
  await expect(notes).toContainText("Bralec Bor je komentiral/-a tvojo objavo");
  await notes.getByRole("link", { name: /komentiral/ }).click();
  await expect(ana).toHaveURL(postUrl);
});

test("feed loads older posts page by page", async ({ page }) => {
  const { handle } = await signUp(page, "Plodna Avtorica");
  const sb = serviceClient();
  const { data: me } = await sb.from("profiles").select("id").eq("handle", handle).single();
  const rows = Array.from({ length: 21 }, (_, i) => ({
    author_id: me!.id,
    caption: `Starejša objava ${i}`,
    created_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
  }));
  const { data: posts, error } = await sb.from("posts").insert(rows).select("id");
  expect(error).toBeNull();
  await sb
    .from("post_photos")
    .insert(posts!.map((p) => ({ post_id: p.id, position: 0, path: `${me!.id}/abcdefgh12.png` })));

  await page.goto("/feed");
  await expect(page.getByTestId("feed-posts").locator(":scope > li")).toHaveCount(20);
  await page.getByRole("link", { name: "Naloži starejše objave" }).click();
  await expect(page).toHaveURL(/pred=/);
  await expect(page.getByTestId("feed-posts")).toContainText("Starejša objava 20");
  await expect(page.getByRole("link", { name: "← Na najnovejše objave" })).toBeVisible();
});

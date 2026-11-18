import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

test("readers like, rate and ask; the author is notified and answers", async ({ browser }) => {
  const author = await (await browser.newContext()).newPage();
  const reader = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  await signUp(author, "Avtorica Maja");
  await signUp(reader, "Bralka Neža");

  await author.goto("/ustvari/ideja");
  const title = `Pletena košara ${uid("")}`;
  await author.getByLabel("Naslov ideje").fill(title);
  await author.getByLabel("Kategorija").selectOption({ label: "Ročna dela in tekstil" });
  await author.getByLabel("Navodila").fill("1. Nareži trakove.\n2. Prepleti dno.\n3. Dvigni stene.");
  await author.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(author).toHaveURL(/\/ideje\/[a-z0-9-]+$/);
  const ideaUrl = author.url();
  // Authors cannot rate their own idea.
  await expect(author.getByText("Oceni idejo")).toHaveCount(0);

  await reader.goto(ideaUrl);
  await reader.getByRole("button", { name: /Všečkaj idejo/ }).click();
  await expect(reader.getByRole("button", { name: /Odstrani všeček/ })).toContainText("1");
  await reader.getByRole("button", { name: "4 zvezdice" }).click();
  await expect(reader.getByText("Tvoja ocena: 4/5")).toBeVisible();
  await reader.getByRole("button", { name: "5 zvezdic" }).click();
  await expect(reader.getByText("Tvoja ocena: 5/5")).toBeVisible();
  await expect(reader.getByTestId("idea-rating")).toContainText("(1 ocen)");
  await reader.getByLabel("Napiši komentar ali vprašanje").fill("Kakšen papir uporabljaš?");
  await reader.getByRole("button", { name: "Komentiraj" }).click();
  await expect(reader.getByTestId("idea-comments")).toContainText("Kakšen papir uporabljaš?");
  await checkPage(reader);

  await author.goto("/obvestila");
  const notes = author.getByTestId("notifications");
  await expect(notes).toContainText("Bralka Neža je všečkal/-a tvojo idejo.");
  await expect(notes).toContainText("Bralka Neža je ocenil/-a tvojo idejo: 4/5.");
  await expect(notes).toContainText("Bralka Neža je komentiral/-a tvojo idejo");
  await author.goto(ideaUrl);
  await author.getByLabel("Napiši komentar ali vprašanje").fill("Navaden papir za tisk, 80 g.");
  await author.getByRole("button", { name: "Komentiraj" }).click();
  await expect(author.getByTestId("idea-comments").locator("li").filter({ hasText: "80 g" })).toContainText(
    "avtor",
  );

  // Guests: counts and average only, no comments.
  await guest.goto(ideaUrl);
  await expect(guest.getByTestId("idea-stats")).toContainText("5,0");
  await expect(guest.getByTestId("idea-comments")).toHaveCount(0);
  await guest.goto(`/odkrivanje?pogled=ideje&q=${encodeURIComponent(title)}`);
  await expect(guest.getByTestId("ideas-feed")).toContainText("5,0");
});

import { expect, test } from "@playwright/test";
import { checkPage, grantPlatformRole, signUp, uid } from "../helpers";

test("publish an idea, find it, save it; a moderator hides it after a report", async ({ browser }) => {
  const author = await (await browser.newContext()).newPage();
  const reader = await (await browser.newContext()).newPage();
  const mod = await (await browser.newContext()).newPage();
  await signUp(author, "Ustvarjalka Pia");
  await signUp(reader, "Bralec Tim");
  const { handle: modHandle } = await signUp(mod, "Moderator Max");
  await grantPlatformRole(modHandle, "moderator");

  // Author: Ustvari → Ideja, validation, publish.
  await author.goto("/ustvari");
  await author.getByRole("link", { name: /Ideja/ }).click();
  await expect(author).toHaveURL(/\/ustvari\/ideja$/);
  await checkPage(author);
  await author.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(author.getByText("Vsaj 3 znaki.")).toBeVisible();
  await expect(author.getByText("Izberi kategorijo.")).toBeVisible();
  await expect(author.getByText("Opiši postopek (vsaj 20 znakov).")).toBeVisible();

  const title = `Origami žerjav ${uid("")}`;
  await author.getByLabel("Naslov ideje").fill(title);
  await author.getByLabel("Kratek opis").fill("Prepogni svojega prvega žerjava.");
  await author.getByLabel("Kategorija").selectOption({ label: "Umetnost in risanje" });
  await author
    .getByLabel("Navodila")
    .fill("1. Vzemi kvadraten list papirja.\n2. Prepogni ga po diagonali.\n3. Oblikuj krila in glavo.");
  await author.getByLabel("Potrebščine (neobvezno)").fill("Kvadraten papir");
  await author.getByLabel("Primerno za začetnike").check();
  await author.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(author).toHaveURL(/\/ideje\//);
  await expect(author.getByRole("heading", { name: title })).toBeVisible();
  await expect(author.getByTestId("idea-steps").locator("li")).toHaveCount(3);
  await checkPage(author);
  const ideaUrl = author.url();

  // Reader finds it via Ideje + category + quick filter, saves and reports it.
  await reader.goto(
    `/odkrivanje?pogled=ideje&kategorija=umetnost&f=zacetniki&q=${encodeURIComponent(title)}`,
  );
  await reader.getByRole("link", { name: new RegExp(title) }).click();
  await expect(reader.getByText("Ustvarjalka Pia")).toBeVisible();
  await reader.getByRole("button", { name: "Shrani" }).click();
  await expect(reader.getByRole("button", { name: "Shranjeno" })).toBeVisible();
  await reader.goto("/moj-mekko/shranjeno");
  await expect(reader.getByTestId("saved-list")).toContainText(title);
  await reader.goto(ideaUrl);
  await reader.getByText("Prijavi idejo").click();
  await reader.getByLabel("Razlog prijave").selectOption("copyright");
  await reader.getByRole("button", { name: "Pošlji prijavo" }).click();
  await expect(reader.getByText("Hvala. Prijavo smo prejeli")).toBeVisible();

  // Moderator hides it from the queue.
  await mod.goto("/admin/prijave");
  const item = mod.getByTestId("admin-reports").locator("li").filter({ hasText: title });
  await item.getByPlaceholder("Opomba (obvezno)").fill("Kopija tujih navodil");
  await item.getByLabel("Skrij idejo").check();
  await item.getByRole("button", { name: "Ukrepano" }).click();
  await expect(item).toHaveCount(0);

  // Hidden for others; author sees it marked with the reason.
  await reader.goto(`/odkrivanje?pogled=ideje&q=${encodeURIComponent(title)}`);
  await expect(reader.getByText("Ni zadetkov")).toBeVisible();
  await author.goto("/moj-mekko/ideje");
  await expect(author.getByTestId("my-ideas")).toContainText("Skrita");
  await author.goto(ideaUrl);
  await expect(author.getByText("Moderatorji so idejo skrili: Kopija tujih navodil")).toBeVisible();
});

test("guests see an idea preview but not the instructions", async ({ page }) => {
  await page.goto("/odkrivanje?pogled=ideje");
  await page.getByRole("link", { name: /Akvarelne voščilnice/ }).click();
  await expect(page.getByText("Testna ideja").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByTestId("login-gate")).toBeVisible();
  await expect(page.getByTestId("idea-steps")).toHaveCount(0);
  await checkPage(page);
});

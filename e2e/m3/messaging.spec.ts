import { expect, test, type Page } from "@playwright/test";
import { checkPage, grantPlatformRole, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Organizer with a fresh space and one published event. Returns the event title and space slug. */
async function organizerWithEvent(org: Page, name: string) {
  await signUp(org, name);
  await org.goto(
    `/organizator/nov-prostor?vrsta=solo_creator&ime=${encodeURIComponent(`${name} ${uid("")}`)}`,
  );
  const spaceSlug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${spaceSlug}$`));
  await org.goto(`/organizator/${spaceSlug}/dogodki/nov`);
  const title = `Sitotisk ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel("Kratek opis", { exact: true }).fill("Natisni svojo vrečko.");
  await org.getByLabel(/^Datum/).fill(dateInDays(8));
  await org.getByLabel("Kraj", { exact: true }).fill("Ljubljana");
  await org.getByLabel("Naslov lokacije").fill("Metelkova 6, Ljubljana");
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();
  return { title, spaceSlug };
}

test("visitor writes to an organizer, organizer replies, then blocks", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  const { title } = await organizerWithEvent(org, "Organizatorka Maja");
  await signUp(visitor, "Obiskovalka Tina");

  // Visitor: event page → "Piši organizatorju".
  await visitor.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: new RegExp(title) }).click();
  await visitor.getByRole("button", { name: "Pošlji sporočilo" }).click();
  await expect(visitor.getByText("Napiši sporočilo.")).toBeVisible();
  await visitor.getByLabel("Piši organizatorju").fill("Ali potrebujem svojo majico?");
  await visitor.getByRole("button", { name: "Pošlji sporočilo" }).click();
  await expect(visitor).toHaveURL(/\/sporocila\/[0-9a-f-]{36}$/);
  await expect(visitor.getByTestId("thread")).toContainText("Ali potrebujem svojo majico?");
  await checkPage(visitor);

  // Organizer: unread badge → inbox → reply.
  await org.goto("/odkrivanje");
  await expect(org.getByTestId("unread-messages")).toHaveText(/1/);
  await org.getByTestId("header-messages").click();
  await expect(org.getByTestId("conversations")).toContainText("Obiskovalka Tina");
  await checkPage(org);
  await org.getByTestId("conversations").getByRole("link").first().click();
  await expect(org.getByTestId("thread")).toContainText("Ali potrebujem svojo majico?");
  await org.getByLabel("Novo sporočilo").fill("Ne, vrečke in barve so vključene.");
  await org.getByRole("button", { name: "Pošlji", exact: true }).click();
  await expect(org.getByTestId("thread")).toContainText("Ne, vrečke in barve so vključene.");
  await expect(org.getByLabel("Novo sporočilo")).toHaveValue("");
  await checkPage(org);

  // Visitor sees the reply.
  await visitor.goto("/sporocila");
  await expect(visitor.getByTestId("conversations")).toContainText("Ne, vrečke in barve so vključene.");
  await visitor.getByTestId("conversations").getByRole("link").first().click();
  await expect(visitor.getByTestId("thread")).toContainText("Ne, vrečke in barve so vključene.");

  // Organizer blocks the visitor: nobody can write any more.
  await org.reload();
  await org.getByRole("button", { name: "Blokiraj Obiskovalka Tina" }).click();
  await expect(org.getByText("Osebo si blokiral/-a.")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("Tej osebi trenutno ne moreš pisati.")).toBeVisible();
  await expect(visitor.getByTestId("reply-form")).toHaveCount(0);

  // Unblock from Moj Mekko.
  await org.goto("/moj-mekko/blokirani");
  await expect(org.getByTestId("blocked-list")).toContainText("Obiskovalka Tina");
  await checkPage(org);
  await org.getByRole("button", { name: "Odblokiraj Obiskovalka Tina" }).click();
  await expect(org.getByText("Nikogar nisi blokiral/-a")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByTestId("reply-form")).toBeVisible();
});

test("reported message is removed by a moderator", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  const mod = await (await browser.newContext()).newPage();
  const { spaceSlug } = await organizerWithEvent(org, "Organizator Rok");
  await signUp(visitor, "Nadležni Gost");
  const { handle: modHandle } = await signUp(mod, "Moderatorka Nina");
  await grantPlatformRole(modHandle, "moderator");

  const spam = `Kupi poceni sledilce ${uid("")}`;
  await visitor.goto(`/prostori/${spaceSlug}`);
  await visitor.getByLabel("Piši organizatorju").fill(spam);
  await visitor.getByRole("button", { name: "Pošlji sporočilo" }).click();
  await expect(visitor.getByTestId("thread")).toContainText(spam);

  // Organizer reports the message.
  await org.goto("/sporocila");
  await org.getByTestId("conversations").getByRole("link").first().click();
  const thread = org.getByTestId("thread");
  await thread.getByText("Prijavi sporočilo").click();
  await thread.getByLabel("Razlog prijave").selectOption("spam");
  await thread.getByLabel("Podrobnosti (neobvezno)").fill("Oglaševanje");
  await thread.getByRole("button", { name: "Pošlji prijavo" }).click();
  await expect(thread.getByText("Hvala. Prijavo smo prejeli")).toBeVisible();

  // Moderator: queue → remove + resolve.
  await mod.goto("/admin/prijave");
  const item = mod.getByTestId("admin-reports").locator("li").filter({ hasText: spam });
  await expect(item).toBeVisible();
  await checkPage(mod);
  await item.getByPlaceholder("Opomba (obvezno)").fill("Spam, odstranjeno");
  await item.getByLabel("Odstrani sporočilo").check();
  await item.getByRole("button", { name: "Ukrepano" }).click();
  // Resolved reports leave the open queue.
  await expect(item).toHaveCount(0);

  // Sender sees the message is gone.
  await visitor.reload();
  await expect(visitor.getByTestId("thread")).toContainText("Sporočilo je odstranil moderator.");
  await expect(visitor.getByTestId("thread")).not.toContainText(spam);

  // Ordinary users cannot open the moderation queue.
  await visitor.goto("/admin/prijave");
  await expect(visitor.getByText("Strani ni bilo mogoče najti")).toBeVisible();
});

test("owner requests verification, admin approves it", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  const { spaceSlug } = await organizerWithEvent(org, "Organizatorka Lea");
  const { handle } = await signUp(admin, "Admin Ana");
  await grantPlatformRole(handle, "admin");

  await org.goto(`/organizator/${spaceSlug}`);
  await org.getByRole("button", { name: "Zaprosi za preverjanje" }).click();
  // The page revalidates into the "pending" state.
  await expect(org.getByTestId("verification")).toContainText("Zahteva za preverjanje je oddana.");

  await admin.goto("/admin/prostori");
  const row = admin.getByTestId("admin-spaces").locator("li").filter({ hasText: spaceSlug });
  await expect(row).toContainText("Čaka na preverjanje");
  await checkPage(admin);
  await row.getByPlaceholder("Kako je bilo preverjeno (obvezno)").fill("Klic in AJPES");
  await row.getByRole("button", { name: "Potrdi organizatorja" }).click();
  await expect(row).toContainText("Preverjen");
  await expect(row.getByRole("button", { name: "Potrdi organizatorja" })).toHaveCount(0);

  await org.goto("/obvestila");
  await expect(org.getByTestId("notifications")).toContainText("je preverjen organizator");
  await org.goto(`/organizator/${spaceSlug}`);
  await expect(org.getByTestId("verification")).toContainText("Prostor je preverjen.");
});

test("demo organizers cannot be messaged; guests see no contact form", async ({ page }) => {
  await page.goto("/dogodki/keramika-za-zacetnike");
  await expect(page.getByLabel("Piši organizatorju")).toHaveCount(0);
  await signUp(page, "Radovedni Miha");
  await page.goto("/dogodki/keramika-za-zacetnike");
  await expect(page.getByText("To je testni organizator, zato mu ni mogoče pisati.")).toBeVisible();
  await expect(page.getByLabel("Piši organizatorju")).toHaveCount(0);
});

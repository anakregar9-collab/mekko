import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test("community with approval: request, accept, members-only event, announcement", async ({ browser }) => {
  const org = await (await browser.newContext()).newPage();
  const member = await (await browser.newContext()).newPage();
  const stranger = await (await browser.newContext()).newPage();
  await signUp(org, "Vodja krožka Mojca");
  await signUp(member, "Članica Petra");
  await signUp(stranger, "Mimoidoči Gregor");

  const name = `Kvačkarski krožek ${uid("")}`;
  await org.goto(`/organizator/nov-prostor?vrsta=community&ime=${encodeURIComponent(name)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));

  // Membership with approval
  await org.getByRole("link", { name: "Člani" }).first().click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}/clani$`));
  await org.getByLabel(/S potrditvijo/).check();
  await org.getByRole("button", { name: "Shrani način članstva" }).click();
  await expect(org.getByText("Shranjeno.")).toBeVisible();
  await checkPage(org);

  // Members-only event
  await org.goto(`/organizator/${slug}/dogodki/nov`);
  const title = `Samo za člane ${uid("")}`;
  await org.getByLabel("Ime dogodka").fill(title);
  await org.getByLabel(/^Datum/).fill(dateInDays(9));
  await org.getByLabel("Kraj", { exact: true }).fill("Celje");
  await org.getByLabel("Samo za člane prostora").check();
  await org.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(org.getByText("Objavljeno")).toBeVisible();

  // Not visible in discovery, nor on the space page for non-members
  await stranger.goto(`/odkrivanje?q=${encodeURIComponent(title)}`);
  await expect(stranger.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  await stranger.goto(`/prostori/${slug}`);
  await expect(stranger.getByText(title)).toHaveCount(0);

  // Join request
  await member.goto(`/prostori/${slug}`);
  const box = member.getByTestId("membership-box");
  await box.getByRole("button", { name: "Pošlji prošnjo za članstvo" }).click();
  await expect(box).toContainText("Prošnja čaka na potrditev");
  await expect(member.getByText(title)).toHaveCount(0);

  await org.goto("/obvestila");
  await expect(org.getByTestId("notifications")).toContainText(`Prošnja za članstvo: ${name}`);
  await org.goto(`/organizator/${slug}/clani`);
  await org.getByTestId("member-requests").getByRole("button", { name: "Sprejmi" }).click();
  await expect(org.getByTestId("member-list")).toContainText("Članica Petra");

  // Member sees the members-only event
  await member.goto(`/prostori/${slug}`);
  await expect(member.getByTestId("membership-box")).toContainText("Si član/-ica");
  await expect(member.getByText("Samo za člane").first()).toBeVisible();
  await member.getByRole("link", { name: new RegExp(title) }).click();
  await expect(member.getByRole("heading", { name: title })).toBeVisible();
  await member.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(member.getByTestId("my-booking")).toBeVisible();

  // Announcement
  await org.goto(`/organizator/${slug}/clani`);
  const msg = `Prinesite svojo kvačko ${uid("")}`;
  await org.getByLabel("Obvestilo za člane").fill(msg);
  await org.getByRole("button", { name: "Objavi in obvesti člane" }).click();
  await expect(org.getByText("Obvestilo je objavljeno in poslano članom.")).toBeVisible();

  await member.goto("/obvestila");
  await expect(member.getByTestId("notifications")).toContainText(`Novo za člane: ${name}`);
  await member.goto(`/prostori/${slug}`);
  await expect(member.getByTestId("announcements")).toContainText(msg);
  await checkPage(member);

  // Stranger still cannot see announcements
  await stranger.goto(`/prostori/${slug}`);
  await expect(stranger.getByTestId("announcements")).toHaveCount(0);
});

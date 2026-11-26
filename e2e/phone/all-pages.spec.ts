import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { grantPlatformRole, serviceClient, signUp, uid } from "../helpers";

/**
 * Whole-app sweep: every real page (visitor, organizer, admin, guest) at every phone width and desktop.
 * Collects all horizontal-overflow and serious/critical axe issues and fails once with the full list.
 * Set AUDIT_SHOTS=<dir> to also save a screenshot of every page for a visual review.
 */
test.setTimeout(240_000);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function audit(page: Page, paths: string[], issues: string[], project: string) {
  const shots = process.env.AUDIT_SHOTS;
  if (shots) mkdirSync(`${shots}/${project}`, { recursive: true });
  for (const path of paths) {
    const res = await page.goto(path);
    if (!res || res.status() >= 400) {
      issues.push(`${path}: HTTP ${res?.status()}`);
      continue;
    }
    await page.waitForFunction(() => document.title.trim().length > 0, null, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => {
      const extra = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (extra <= 0) return null;
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed";
        })
        .slice(-3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      return `${extra}px (${wide.join(" | ")})`;
    });
    if (overflow) issues.push(`${path}: overflow ${overflow}`);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical"))
      issues.push(`${path}: ${v.id} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    if (shots) {
      const name = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
      await page.screenshot({ path: `${shots}/${project}/${name}.png`, fullPage: true });
    }
  }
}

test("every page fits the screen and has no serious accessibility issues", async ({ browser }, info) => {
  const page = await (await browser.newContext()).newPage();
  const { handle } = await signUp(page, "Pregledovalka Vse Strani");
  await grantPlatformRole(handle, "admin");

  // Space + published event
  await page.goto(`/organizator/nov-prostor?vrsta=community&ime=${encodeURIComponent(`Pregled ${uid("")}`)}`);
  const slug = await page.getByLabel("Spletni naslov").inputValue();
  await page.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(page).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await page.goto(`/organizator/${slug}/dogodki/nov`);
  await page.getByLabel("Ime dogodka").fill(`Pregledni dogodek z daljšim imenom ${uid("")}`);
  await page.getByLabel("Kratek opis", { exact: true }).fill("Kratek opis za pregled strani na telefonu.");
  await page.getByLabel(/^Datum/).fill(dateInDays(5));
  await page.getByLabel("Kraj", { exact: true }).fill("Ljubljana");
  await page.getByLabel("Število mest").fill("8");
  await page.getByRole("button", { name: "Objavi dogodek" }).click();
  await expect(page.getByText("Objavljeno")).toBeVisible();
  const eventId = page.url().split("/").pop()!;
  const eventSlug = new URL(
    (await page.getByRole("link", { name: /Javna stran/ }).getAttribute("href"))!,
    "http://x",
  ).pathname;
  await page.goto(eventSlug);
  await page.getByRole("button", { name: "Prijavi se", exact: true }).click();
  await expect(page.getByTestId("my-booking")).toBeVisible();

  // Idea
  await page.goto("/ustvari/ideja");
  await page.getByLabel("Naslov ideje").fill(`Ideja za pregled ${uid("")}`);
  await page.getByLabel("Kategorija").selectOption({ label: "Dom, deko in rastline" });
  await page.getByLabel("Navodila").fill("1. Pripravi material.\n2. Naredi.\n3. Pokaži v feedu.");
  await page.getByRole("button", { name: "Objavi idejo" }).click();
  await expect(page).toHaveURL(/\/ideje\//);
  const ideaPath = new URL(page.url()).pathname;

  // Feed post
  await page.goto("/objave/nova");
  await page
    .locator('input[type="file"][accept]')
    .filter({ visible: true })
    .first()
    .setInputFiles([{ name: "izdelek.png", mimeType: "image/png", buffer: PNG }]);
  await page.getByRole("textbox", { name: "Opis (neobvezno)" }).fill("Objava za pregled strani.");
  await page.getByLabel(/Na fotografijah ni prepoznavnih otrok/).check();
  await page.getByRole("button", { name: "Objavi" }).click();
  await expect(page).toHaveURL(/\/objave\/[0-9a-f-]{36}$/);
  const postPath = new URL(page.url()).pathname;

  // Test setup through the local service key: a pass, a course with lessons, so pages show real content.
  const sb = serviceClient();
  const { data: me } = await sb.from("profiles").select("id").eq("handle", handle).single();
  const { data: sp } = await sb.from("spaces").select("id").eq("slug", slug).single();
  await sb.from("spaces").update({ legal_form: "sole_trader" }).eq("id", sp!.id);
  await sb.from("events").update({ accepts_passes: true }).eq("id", eventId);
  const later = Date.now() + 9 * 86_400_000;
  await sb.from("event_occurrences").insert({
    event_id: eventId,
    starts_at: new Date(later).toISOString(),
    ends_at: new Date(later + 7_200_000).toISOString(),
  });
  const { data: pt } = await sb
    .from("pass_types")
    .insert({
      space_id: sp!.id,
      name: "10 obiskov ustvarjalnice",
      visits: 10,
      price_cents: 9000,
      validity_days: 90,
      payment_instructions: "IBAN SI56 0000 TEST, sklic: ime in priimek",
      payment_link: "https://buy.stripe.com/test_pregled",
      created_by: me!.id,
    })
    .select("id")
    .single();
  await sb.from("passes").insert({
    pass_type_id: pt!.id,
    space_id: sp!.id,
    holder_id: me!.id,
    name: "10 obiskov ustvarjalnice",
    visits: 10,
    price_cents: 9000,
    validity_days: 90,
    status: "active",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 90 * 86_400_000).toISOString(),
  });
  const courseSlug = `pregledni-tecaj-${uid("").toLowerCase()}`;
  const { data: course } = await sb
    .from("courses")
    .insert({
      space_id: sp!.id,
      slug: courseSlug,
      title: "Pregledni tečaj z dolgim imenom za preizkus prelamljanja",
      summary: "Od prvih potez do končnega izdelka.",
      description: "Opis tečaja za pregled strani na telefonu.",
      price_cents: 2900,
      payment_instructions: "IBAN SI56 0000 TEST",
      created_by: me!.id,
    })
    .select("id")
    .single();
  const { error: lessonErr } = await sb.from("course_lessons").insert([
    {
      course_id: course!.id,
      position: 1,
      title: "Uvod in pripomočki",
      youtube_id: "dQw4w9WgXcQ",
      notes: null,
      is_preview: true,
    },
    {
      course_id: course!.id,
      position: 2,
      title: "Druga lekcija z daljšim naslovom",
      youtube_id: "aaaaaaaaaaa",
      notes: "Zapiski.",
      is_preview: false,
    },
  ]);
  expect(lessonErr, "test setup: lessons").toBeNull();
  const { error: pubErr } = await sb.from("courses").update({ status: "published" }).eq("id", course!.id);
  expect(pubErr, "test setup: course must publish").toBeNull();

  const issues: string[] = [];
  const project = info.project.name;
  await audit(
    page,
    [
      "/odkrivanje",
      "/odkrivanje?pogled=ideje",
      eventSlug,
      ideaPath,
      `${ideaPath}/uredi`,
      `/prostori/${slug}`,
      `/u/${handle}`,
      postPath,
      `${postPath}/deli`,
      "/moje-aktivnosti",
      "/ustvari",
      "/ustvari/ideja",
      "/feed",
      "/feed?pogled=navdih",
      "/feed/iskanje?q=pre",
      "/objave/nova",
      "/obvestila",
      "/sporocila",
      "/moj-mekko",
      "/moj-mekko/profil",
      "/moj-mekko/zanimanja",
      "/moj-mekko/shranjeno",
      "/moj-mekko/ideje",
      "/moj-mekko/sledilci",
      "/moj-mekko/blokirani",
      "/moj-mekko/podatki",
      "/moj-mekko/karte",
      "/moj-mekko/tecaji",
      "/pogoji",
      "/zasebnost",
      "/organizator",
      "/organizator/nov-prostor",
      `/organizator/${slug}`,
      `/organizator/${slug}/dogodki`,
      `/organizator/${slug}/dogodki/nov`,
      `/organizator/${slug}/dogodki/${eventId}`,
      `/organizator/${slug}/dogodki/${eventId}/uredi`,
      `/organizator/${slug}/koledar`,
      `/organizator/${slug}/placila`,
      `/organizator/${slug}/karte`,
      `/organizator/${slug}/tecaji`,
      `/organizator/${slug}/tecaji/${course!.id}`,
      `/tecaji/${courseSlug}`,
      `/organizator/${slug}/ekipa`,
      `/organizator/${slug}/clani`,
      `/organizator/${slug}/nastavitve`,
      "/admin",
      "/admin/prijave",
      "/admin/prostori",
      "/admin/uporabniki",
      "/admin/zahteve",
      "/admin/revizija",
    ],
    issues,
    project,
  );

  const guest = await (await browser.newContext()).newPage();
  await audit(
    guest,
    ["/", eventSlug, ideaPath, `/prostori/${slug}`, `/tecaji/${courseSlug}`, "/prijava", "/pogoji"],
    issues,
    `${project}-guest`,
  );

  expect(issues, issues.join("\n")).toEqual([]);
});

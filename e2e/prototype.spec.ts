import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const visitorScreens = [
  "/prototip/odkrivanje",
  "/prototip/dogodki/keramika-za-zacetnike",
  "/prototip/moje-aktivnosti",
  "/prototip/ustvari",
  "/prototip/ustvari/dogodek",
  "/prototip/moj-mekko",
  "/prototip/sporocila",
  "/prototip/obvestila",
];
const workspaceScreens = ["/prototip/organizator", "/prototip/admin"];
const allScreens = ["/", ...visitorScreens, ...workspaceScreens];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

for (const path of allScreens) {
  test(`${path}: renders without horizontal overflow or serious a11y violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

for (const path of [...visitorScreens, ...workspaceScreens]) {
  test(`${path}: is clearly marked as demo`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId("demo-banner")).toBeVisible();
  });
}

test.describe("visitor shell", () => {
  for (const path of visitorScreens) {
    test(`${path}: exactly one main nav with the four tabs and two header icons`, async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: "Glavna navigacija" });
      await expect(nav).toHaveCount(1);
      await expect(nav.getByRole("list").getByRole("link")).toHaveText([
        "Odkrivanje",
        "Moje aktivnosti",
        "Ustvari",
        "Moj Mekko",
      ]);
      await expect(page.getByTestId("header-messages")).toBeVisible();
      await expect(page.getByTestId("header-notifications")).toBeVisible();
      // Messages and notifications are separate destinations.
      await expect(page.getByTestId("header-messages")).toHaveAttribute("href", "/prototip/sporocila");
      await expect(page.getByTestId("header-notifications")).toHaveAttribute("href", "/prototip/obvestila");
    });
  }

  test("nav tabs meet the 44px touch target and mark the active tab", async ({ page }) => {
    await page.goto("/prototip/dogodki/keramika-za-zacetnike");
    for (const key of ["odkrivanje", "moje-aktivnosti", "ustvari", "moj-mekko"]) {
      const box = await page.getByTestId(`tab-${key}`).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByTestId("tab-odkrivanje")).toHaveAttribute("aria-current", "page");
  });
});

test("discovery: search and category filters narrow results and recover from empty state", async ({
  page,
}) => {
  await page.goto("/prototip/odkrivanje");
  const feed = page.getByTestId("feed");
  const cards = feed.locator(":scope > li");
  const initial = await cards.count();
  expect(initial).toBeGreaterThan(3);

  await page.getByRole("searchbox", { name: "Išči dogodke in ideje" }).fill("keramika");
  await expect(cards).toHaveCount(1);

  await page.getByRole("searchbox").fill("neobstojeceee");
  await expect(page.getByText("Ni zadetkov")).toBeVisible();
  await page.getByRole("button", { name: "Počisti filtre" }).click();
  await expect(cards).toHaveCount(initial);

  await page.getByRole("group", { name: "Kategorije" }).getByRole("button", { name: "Ročna dela" }).click();
  await expect(feed.getByText("Tečaj pletenja – 4 srečanja")).toBeVisible();
  await expect(feed.getByText("Keramika za začetnike")).toHaveCount(0);
});

test("event detail: guest sees a login gate, signed-in view reveals address", async ({ page }) => {
  await page.goto("/prototip/odkrivanje");
  await page.getByRole("link", { name: /Keramika za začetnike/ }).click();
  await expect(page).toHaveURL(/keramika-za-zacetnike/);
  await expect(page.getByTestId("login-gate")).toBeVisible();
  await expect(page.getByText("Trubarjeva cesta 12")).toHaveCount(0);

  await page.getByRole("button", { name: "Prijavljen" }).click();
  await expect(page.getByText("Trubarjeva cesta 12, 1000 Ljubljana")).toBeVisible();
  await page.getByRole("button", { name: "Rezerviraj", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Prototip:" }).first()).toBeVisible();
});

test("event detail: external registration is labelled as leaving Mekko", async ({ page }) => {
  await page.goto("/prototip/dogodki/svece-iz-sojinega-voska");
  const link = page.getByRole("link", { name: /Prijava pri organizatorju/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("my activities: multi-session booking shows all sessions; calendar view works", async ({ page }) => {
  await page.goto("/prototip/moje-aktivnosti");
  const list = page.getByTestId("activities-list");
  await expect(list.getByText(/srečanje \d/)).toHaveCount(4);
  await page.getByRole("button", { name: "Koledar" }).click();
  await expect(page.getByTestId("activities-calendar")).toBeVisible();
  await page.getByRole("button", { name: /^21\. november/ }).click();
  await expect(page.getByTestId("activities-calendar").getByText("Keramika za začetnike")).toBeVisible();
  await page.getByRole("button", { name: "Naslednji mesec" }).click();
  await expect(page.getByRole("heading", { name: /december 2026/i })).toBeVisible();
});

test("create event flow: validates, steps through and never claims to save", async ({ page }) => {
  await page.goto("/prototip/ustvari");
  await page.getByRole("link", { name: /Dogodek ali delavnica/ }).click();
  const formAlert = page.locator("form [role=alert]");
  await page.getByRole("button", { name: "Naprej" }).click();
  await expect(formAlert).toContainText("Naslov");

  await page.getByLabel("Naslov").fill("Tkanje na statve");
  await page.getByText("Večkratni tečaj").click();
  await page.getByRole("button", { name: "Naprej" }).click();

  await page.getByLabel(/^Datum/).fill("2026-12-05");
  await page.getByRole("button", { name: "Dodaj termin" }).click();
  await page.getByLabel("Datum 2").fill("2026-12-12");
  await page.getByRole("button", { name: "Naprej" }).click();

  await page.getByText("Zunanja povezava").click();
  await page.getByLabel("Povezava do prijave").fill("http://nevarno.example");
  await page.getByRole("button", { name: "Naprej" }).click();
  await expect(formAlert).toContainText("https://");
  await page.getByLabel("Povezava do prijave").fill("https://example.org/prijava");
  await page.getByRole("button", { name: "Naprej" }).click();

  await expect(page.getByText("Tkanje na statve")).toBeVisible();
  await page.getByRole("button", { name: "Objavi (prototip)" }).click();
  await expect(page.getByText("Prototip: dogodek ni bil shranjen")).toBeVisible();
});

test("organizer mode is reachable from Moj Mekko and back", async ({ page }) => {
  await page.goto("/prototip/moj-mekko");
  await page.getByTestId("switch-organizer").click();
  await expect(page).toHaveURL(/\/prototip\/organizator$/);
  await expect(page.getByRole("navigation", { name: "Navigacija organizatorja" })).toHaveCount(1);
  await expect(page.getByText("Finance in izplačila: M3")).toBeVisible();
  await page.getByRole("link", { name: "V Mekko" }).click();
  await expect(page).toHaveURL(/\/prototip\/moj-mekko$/);
});

test("admin shows no fabricated financial figures", async ({ page }) => {
  await page.goto("/prototip/admin");
  await expect(page.getByText("Transakcije: M3")).toBeVisible();
  await expect(page.getByText("Ni določena – odprta odločitev").first()).toBeVisible();
});

import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

export const TEST_PASSWORD = "Mekko-test-2026";

export function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a new account with e-mail + password (confirmation is off). */
export async function register(page: Page, email: string, path = "/prijava") {
  await page.goto(path);
  await page.getByRole("button", { name: "Nov račun" }).click();
  await page.getByLabel("E-pošta").fill(email);
  await page.getByLabel("Geslo").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Ustvari račun" }).click();
}

export async function login(page: Page, email: string, password = TEST_PASSWORD, path = "/prijava") {
  await page.goto(path);
  await page.getByLabel("E-pošta").fill(email);
  await page.getByLabel("Geslo").fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
}

/** Sign up a brand-new user and complete onboarding. Returns the handle. */
export async function signUp(page: Page, name: string): Promise<{ email: string; handle: string }> {
  const handle = uid("t").toLowerCase();
  const email = `${handle}@example.test`;
  await register(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Ime, ki ga vidijo drugi").fill(name);
  await page.getByRole("textbox", { name: "Uporabniško ime" }).fill(handle);
  await page.getByRole("button", { name: "Nadaljuj" }).click();
  await expect(page).toHaveURL(/\/moj-mekko$/);
  return { email, handle };
}

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Run scripts/local-env.sh first (needs local Supabase).");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Test setup only: grant a platform role directly with the LOCAL service key. */
export async function grantPlatformRole(
  handle: string,
  role: "super_admin" | "admin" | "moderator" | "support",
) {
  const sb = serviceClient();
  const { data: profile, error } = await sb.from("profiles").select("id").eq("handle", handle).single();
  if (error) throw error;
  const { error: e2 } = await sb.from("platform_roles").insert({ profile_id: profile.id, role });
  if (e2) throw e2;
}

export async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function expectAccessible(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

export async function checkPage(page: Page) {
  await expectNoOverflow(page);
  await expectAccessible(page);
}

import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Poll the local Mailpit inbox for the newest 6-digit login code sent to `email`. */
export async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=5`);
    const data = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const msg = data.messages.find((m) => Date.parse(m.Created) >= after - 2000);
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as {
        Text: string;
        HTML: string;
      };
      const code = (full.Text || full.HTML).match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No login code for ${email}`);
}

export async function login(page: Page, email: string, path = "/prijava") {
  await page.goto(path);
  await page.getByLabel("E-pošta").fill(email);
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Pošlji kodo" }).click();
  await expect(page.getByLabel("Koda iz e-pošte")).toBeVisible();
  await page.getByLabel("Koda iz e-pošte").fill(await latestCode(email, sentAt));
  await page.getByRole("button", { name: "Prijava" }).click();
}

/** Sign up a brand-new user and complete onboarding. Returns the handle. */
export async function signUp(page: Page, name: string): Promise<{ email: string; handle: string }> {
  const handle = uid("t").toLowerCase();
  const email = `${handle}@example.test`;
  await login(page, email);
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
export async function grantPlatformRole(handle: string, role: "super_admin" | "admin" | "support") {
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

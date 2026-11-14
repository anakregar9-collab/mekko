import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// Load .env.local (local Supabase keys) for the test process; CI writes it via scripts/local-env.sh.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PORT = Number(process.env.E2E_PORT ?? 3210);

/** Acceptance widths from PRODUCT_SPEC §10: 320/375/390/430 phones + desktop. */
const phones = [320, 375, 390, 430].map((width) => ({
  name: `phone-${width}`,
  // Authenticated journeys (e2e/m1) run on the narrowest, a typical phone and desktop.
  testIgnore: width === 375 || width === 430 ? /m1\// : undefined,
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width, height: 800 },
    isMobile: true,
    hasTouch: true,
  },
}));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    locale: "sl-SI",
    timezoneId: "Europe/Ljubljana",
  },
  projects: [
    ...phones,
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // Production build is required (CI runs `pnpm build` first).
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

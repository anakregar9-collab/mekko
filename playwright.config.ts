import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);

/** Acceptance widths from PRODUCT_SPEC §10: 320/375/390/430 phones + desktop. */
const phones = [320, 375, 390, 430].map((width) => ({
  name: `phone-${width}`,
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

import { defineConfig, devices } from "@playwright/test";

// Point at an already-running app with PLAYWRIGHT_BASE_URL; otherwise Playwright starts `npm run dev`.
// (Next allows only one `next dev` per project folder, so reuse the running one when there is one.)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL, ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});

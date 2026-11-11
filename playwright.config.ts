import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E tests run against a production build (`next build` + `next start`),
 * because the caching behaviour in the brief only applies there.
 * A fresh server is started for every run so the in-memory store starts clean.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /(a11y|keyboard)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Runs after the functional specs, which expect the store as seeded.
    {
      name: "a11y",
      testMatch: /(a11y|keyboard)\.spec\.ts/,
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

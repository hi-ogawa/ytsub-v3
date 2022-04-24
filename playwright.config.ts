import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./app/__e2e__",
  globalSetup: "./app/misc/test-setup-global.ts",
  use: {
    baseURL: "http://localhost:3001",
    actionTimeout: 10_000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 560 },
        headless: !process.env.E2E_HEADED,
      },
    },
  ],
  webServer: {
    // TODO: playwright is probably not waiting until c8 finishes creating reports
    command: `npm run dev:prepare && PORT=3001 npm run ${
      process.env.E2E_COVERAGE ? "remix:dev:coverage" : "remix:dev"
    }`,
    port: 3001,
    reuseExistingServer: true,
  },
};

export default config;

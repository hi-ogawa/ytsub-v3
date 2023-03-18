import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./app/__e2e__",
  globalSetup: "./app/misc/test-setup-global-e2e.ts",
  use: {
    baseURL: "http://localhost:3001",
    actionTimeout: 10_000,
    navigationTimeout: 10_000,
    trace: process.env.E2E_CLIENT_TRACE ? "on" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 560 },
      },
    },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "pnpm dev-e2e >> logs/dev-e2e.log 2>&1",
        port: 3001,
        reuseExistingServer: true,
      },
};

export default config;

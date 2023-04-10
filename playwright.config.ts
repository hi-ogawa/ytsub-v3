import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./app/e2e",
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
        // https://github.com/microsoft/playwright/issues/1086#issuecomment-592227413
        viewport: null, // adopt to browser window size specified below
        launchOptions: {
          args: ["--window-size=600,800"],
        },
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
});

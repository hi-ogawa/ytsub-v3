import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./app/__e2e__",
  use: {
    baseURL: "http://localhost:3001",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: "npm run dev:prepare && PORT=3001 npm run dev",
    port: 3001,
    reuseExistingServer: true,
  },
};

export default config;

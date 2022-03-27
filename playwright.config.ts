import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./app/__playwright__",
  use: {
    baseURL: "http://localhost:3000",
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
    command: "npm run tailwind && npm run copy-assets && npm run dev",
    port: 3000,
    reuseExistingServer: false,
  },
};

export default config;

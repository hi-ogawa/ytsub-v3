import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./app",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/e2e/**"],
    environment: "happy-dom",
    globalSetup: ["./app/misc/test-setup-global.ts"],
    setupFiles: ["./app/misc/test-setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      reportsDirectory: "coverage/unit",
    },
  },
});

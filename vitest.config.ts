import { defineConfig } from "vite";
import type { InlineConfig } from "vitest";

const VITEST_CONFIG: InlineConfig = {
  dir: "app",
  include: ["**/__tests__/**/*.test.{ts,tsx}"],
  environment: "happy-dom",
  globalSetup: ["./app/misc/test-setup-global.ts"],
  setupFiles: ["./app/misc/test-setup.ts"],
  // disable parallel execution since it's not trivial to deal with stateful modules and database uniqueness
  threads: false,
  coverage: {
    reporter: ["text", "html"],
  },
};

export default defineConfig({
  test: VITEST_CONFIG,
});

import { defineConfig } from "vite";
import type { InlineConfig } from "vitest";

const VITEST_CONFIG: InlineConfig = {
  dir: "app",
  include: ["**/__tests__/**/*.test.{ts,tsx}"],
  environment: "happy-dom",
  // disable parallel execution since it's not trivial to deal with stateful modules and database uniqueness
  threads: false,
};

export default defineConfig({
  test: VITEST_CONFIG,
});

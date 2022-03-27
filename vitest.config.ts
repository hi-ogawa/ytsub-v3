import { defineConfig } from "vite";
import type { InlineConfig } from "vitest";

const VITEST_CONFIG: InlineConfig = {
  dir: "app",
  include: ["**/__tests__/**/*.test.{ts,tsx}"],
  environment: "happy-dom",
};

export default defineConfig({
  test: VITEST_CONFIG,
});

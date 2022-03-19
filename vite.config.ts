import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 3030,
  },
  clearScreen: false,
  publicDir: false,
  resolve: {
    alias:
      command === "build"
        ? {
            "./build/tailwind/development/index.css":
              "./build/tailwind/production/index.css",
          }
        : undefined,
  },
}));

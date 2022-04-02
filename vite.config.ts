import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Using vite for UI dev playground with HMR (see app/components/main-dev.tsx)

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

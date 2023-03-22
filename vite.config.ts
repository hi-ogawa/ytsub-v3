import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [unocss(), react()],
  clearScreen: false,
  publicDir: false,
});

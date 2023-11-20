import { themeScriptPlugin } from "@hiogawa/theme-script/dist/vite";
import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  publicDir: false,
  plugins: [
    unocss(),
    react(),
    themeScriptPlugin({ storageKey: "ytsub:theme" }),
  ],
});

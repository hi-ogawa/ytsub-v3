import fs from "node:fs";
import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import { Plugin, defineConfig } from "vite";

export default defineConfig({
  plugins: [unocss(), react(), injectThemeScriptPlugin()],
  clearScreen: false,
  publicDir: false,
});

// inject theme initialization script
function injectThemeScriptPlugin(): Plugin {
  const script = fs.readFileSync(
    require.resolve("@hiogawa/utils-experimental/dist/theme-script.global.js"),
    "utf-8"
  );
  return {
    name: "local:" + injectThemeScriptPlugin.name,
    transformIndexHtml() {
      return [
        {
          tag: "script",
          children: `
            globalThis.__themeStorageKey = "ytsub:theme";
            ${script}
          `,
        },
      ];
    },
  };
}

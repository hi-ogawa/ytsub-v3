import fs from "node:fs";
import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [unocss(), react(), injectHtmlPlugin()],
  clearScreen: false,
  publicDir: false,
});

// inject theme initialization script
function injectHtmlPlugin() {
  const path = "@hiogawa/utils-experimental/dist/theme-script.global.js";
  const script = fs.readFileSync(path, "utf-8");
  return {
    name: "local:" + injectHtmlPlugin.name,
    transformIndexHtml(html: string) {
      return html.replace(
        /<!--@@INJECT_THEME_SCRIPT@@-->/,
        `\
<script>
  globalThis.__themeStorageKey = "ytsub:theme";
  ${script}
</script>`
      );
    },
  };
}

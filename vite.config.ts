import { importDevServerPlugin } from "@hiogawa/vite-import-dev-server";
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import { vaviteConnect } from "@vavite/connect";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    unocss(),
    importDevServerPlugin(),
    vaviteConnect({
      standalone: false,
      serveClientAssetsInDev: true,
      handlerEntry: "./app/misc/entry-express.ts",
    }),
    !process.env.VITEST && remix({
      routes: (defineRoutes) =>
        createRoutesFromFolders(defineRoutes, {
          ignoredFilePatterns: ["**/*.test.*"],
        }) as any,
    }),
  ],
  clearScreen: false,
  server: {
    port: Number(process.env.PORT ?? "3000"),
  },
});

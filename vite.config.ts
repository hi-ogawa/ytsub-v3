import { importDevServerPlugin } from "@hiogawa/vite-import-dev-server";
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import { vaviteConnect } from "@vavite/connect";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: Number(process.env.PORT ?? "3000"),
  },
  plugins: [
    unocss(),
    importDevServerPlugin(),

    // run our own middleware via vavite before remix
    vaviteConnect({
      standalone: false,
      serveClientAssetsInDev: true,
      handlerEntry: "./app/misc/entry-express.ts",
    }),

    // skip remix on vitest
    !process.env.VITEST &&
      remix({
        routes: (defineRoutes) =>
          createRoutesFromFolders(defineRoutes, {
            // TODO: why "**/*.serer.*" breaks?
            // TODO: also ignore "*.utils.*"
            ignoredFilePatterns: ["**/*.test.*"],
          }) as any,
      }),

    // since remix overwrites ssr build output of vavite,
    // we overwrite it back with extra plugin.
    {
      name: "overwrite-remix-server-entry",
      config(config, env) {
        if (env.command === "build" && config.build?.ssr) {
          return {
            build: {
              rollupOptions: {
                input: "./app/misc/entry-express.ts",
              },
            },
          };
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      // silence warning by "use client" in react-query https://github.com/TanStack/query/pull/5161#issuecomment-1506683450
      onwarn(warning, defaultHandler) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes(`"use client"`)
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
});

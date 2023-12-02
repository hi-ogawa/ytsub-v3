import { objectPick } from "@hiogawa/utils";
import { importDevServerPlugin } from "@hiogawa/vite-import-dev-server";
import { vitePluginSsrMiddleware } from "@hiogawa/vite-plugin-ssr-middleware";
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
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

    // intercept all the requests before remix
    vitePluginSsrMiddleware({
      entry: "./app/misc/entry-express.ts",
    }),

    // skip remix on vitest
    !process.env.VITEST &&
      remix({
        routes: (defineRoutes) =>
          createRoutesFromFolders(defineRoutes, {
            // TODO: why "**/*.serer.*" breaks?
            ignoredFilePatterns: ["**/*.test.*"],
          }) as any,
      }),

    // since remix overwrites ssr build output of vitePluginSsrMiddleware,
    // we need to overwrite it back with extra plugin.
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

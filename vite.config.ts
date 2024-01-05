import { vitePluginSsrMiddleware } from "@hiogawa/vite-plugin-ssr-middleware";
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import unocss from "unocss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  clearScreen: false,
  server: {
    port: Number(process.env.PORT ?? "3000"),
  },
  plugins: [
    unocss(),

    // intercept all the requests before remix
    vitePluginSsrMiddleware({
      entry: "./app/misc/entry-express.ts",
    }),

    // skip remix on vitest
    !process.env.VITEST &&
      remix({
        ignoredRouteFiles: ["**/*"],
        routes: (defineRoutes) => {
          return createRoutesFromFolders(defineRoutes, {
            ignoredFilePatterns: [
              "**/*.test.*",
              "**/*.server.*",
              "**/_utils.*",
              "**/_ui.*",
            ],
          }) as any;
        },
        // false-positive during optimizeDeps discovery
        // https://github.com/remix-run/remix/pull/8267
      }).filter((plugin) => plugin.name !== "remix-dot-server"),

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
  optimizeDeps: {
    // debug this by
    // DEBUG=vite:deps pnpm dev:remix --force
    entries: ["./app/entry-client.tsx", "./app/root.tsx", "./app/routes/**/*"],
  },
  test: {
    dir: "./app",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/e2e/**"],
    globalSetup: ["./app/misc/test-setup-global.ts"],
    setupFiles: ["./app/misc/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage/unit",
    },
  },
});

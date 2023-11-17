import { importDevServerPlugin } from "@hiogawa/vite-import-dev-server";
import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import { vaviteConnect } from "@vavite/connect";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig((env) => ({
  clearScreen: false,
  plugins: [
    unocss(),

    // need to workaround remix's double plugin loading issue
    // https://github.com/remix-run/remix/pull/7911
    // https://github.com/hi-ogawa/vite-plugins/issues/112
    env.command === "serve" && importDevServerPlugin(),

    // run our own middleware via vavite before remix
    vaviteConnect({
      standalone: false,
      serveClientAssetsInDev: true,
      handlerEntry: "./app/misc/entry-express.ts",
    }),

    // skip remix on vitest
    !process.env.VITEST &&
      remix({
        serverBuildPath: `dist/server/index.js`,
        assetsBuildDirectory: `dist/client/build`,
        routes: (defineRoutes) =>
          createRoutesFromFolders(defineRoutes, {
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
  server: {
    port: Number(process.env.PORT ?? "3000"),
  },
  // to be fixed by https://github.com/remix-run/remix/pull/8039
  build: {
    copyPublicDir: false,
  }
}));

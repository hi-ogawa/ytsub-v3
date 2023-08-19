const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
// prettier-ignore
module.exports = {
  serverBuildPath: `build/remix/${env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${env}/public/build`,
  server: "./app/misc/entry-express.ts",
  serverDependenciesToBundle: process.env.BUILD_VERCEL ? "all" : [
    /@hattip/, /@js-temporal/, /node-fetch-native/
  ],
  future: {
    v2_meta: true,
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
  routes: (defineRoutes) =>
    require("@remix-run/v1-route-convention").createRoutesFromFolders(
      defineRoutes,
      { ignoredFilePatterns: ["**/*.test.*"] }
    ),
};

//
// see patches/@remix-run__dev
//
globalThis.__esbuildPluginsCommon = [loaderOverridePlugin()];
globalThis.__esbuildPluginsBrowser = [];
globalThis.__esbuildPluginsServer = [];

// immitate raw loader by require("some-file?loader=text")
function loaderOverridePlugin() {
  const fs = require("node:fs");

  return {
    name: loaderOverridePlugin.name,
    setup(build) {
      build.onResolve({ filter: /loader=.*/ }, (args) => {
        return {
          namespace: loaderOverridePlugin.name,
          path: args.path,
          pluginData: args,
        };
      });
      build.onLoad(
        { namespace: loaderOverridePlugin.name, filter: /.*/ },
        async (args) => {
          const importPath = args.path.split("?")[0];
          const resolveDir = args.pluginData.resolveDir;
          const resolvedPath = require.resolve(importPath, {
            paths: [resolveDir],
          });
          const contents = await fs.promises.readFile(resolvedPath, "utf8");
          const loader = args.path.split("loader=")[1];
          return {
            contents,
            resolveDir,
            loader,
          };
        }
      );
    },
  };
}

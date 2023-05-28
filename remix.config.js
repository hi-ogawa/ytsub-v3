const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
// prettier-ignore
module.exports = {
  serverBuildPath: `build/remix/${env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${env}/public/build`,
  publicPath: process.env.BUILD_VERCEL ? undefined : `/build/remix/${env}/public/build`,
  server: process.env.BUILD_VERCEL ? "./app/misc/entry-vercel.ts" : undefined,
  serverDependenciesToBundle: process.env.BUILD_VERCEL ? "all" : undefined,
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
globalThis.__esbuildPluginsBrowser = [pureCommentPlugin()];
globalThis.__esbuildPluginsServer = [];

// tree-shake `export const loader = makeLoader(...)` from client bundle
function pureCommentPlugin() {
  const fs = require("node:fs");
  const path = require("node:path");

  return {
    name: pureCommentPlugin.name,
    setup(build) {
      build.onLoad(
        {
          namespace: "file",
          filter: new RegExp(
            `${__dirname}/app/`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              ".*.tsx"
          ),
        },
        async (args) => {
          let contents = await fs.promises.readFile(args.path, "utf8");
          if (contents.includes("makeLoader(")) {
            contents = contents.replace(
              "makeLoader(",
              "/* @__PURE__ */ makeLoader("
            );
            return {
              contents,
              resolveDir: path.dirname(args.path),
              loader: "tsx",
            };
          }
        }
      );
    },
  };
}

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

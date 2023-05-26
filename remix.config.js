const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
// prettier-ignore
module.exports = {
  serverBuildPath: `build/remix/${env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${env}/public/build`,
  server:  process.env.BUILD_VERCEL ? "./app/server/entry-vercel.ts" : "./app/server/entry-dev.ts",
  serverDependenciesToBundle: "all",
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
globalThis.__esbuildPluginsServer = [
  env === "production" && noSourceMapNodeModulesPlugin(),
].filter(Boolean);

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

// https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409
function noSourceMapNodeModulesPlugin() {
  const fs = require("node:fs");

  return {
    name: noSourceMapNodeModulesPlugin.name,
    setup(build) {
      build.onLoad({ filter: /node_modules/ }, (args) => {
        if (args.path.endsWith("js")) {
          return {
            contents:
              fs.readFileSync(args.path, "utf8") +
              "\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==",
            loader: "default",
          };
        }
      });
    },
  };
}

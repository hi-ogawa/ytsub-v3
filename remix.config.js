patch();

const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
// prettier-ignore
module.exports = {
  serverBuildPath: `build/remix/${env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${env}/public/build`,
  publicPath: process.env.BUILD_VERCEL ? undefined : `/build/remix/${env}/public/build`,
  server: process.env.BUILD_VERCEL ? "./app/misc/vercel.ts" : undefined,
  future: {
    v2_meta: true,
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
  routes: (defineRoutes) =>
    require("@remix-run/v1-route-convention").createRoutesFromFolders(
      defineRoutes,
      { ignoredFilePatterns: ["**/__tests__/**/*"] }
    ),
};

function patch() {
  // silence tsconfig mandatory options (cf. https://github.com/remix-run/remix/pull/5510)
  const writeConfigDefaults = require("@remix-run/dev/dist/compiler/utils/tsconfig/write-config-defaults.js");
  writeConfigDefaults.writeConfigDefaults = () => {
    console.log("[PATCH:remix.config.js] writeConfigDefaults");
  };
}

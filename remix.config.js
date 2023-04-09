const env = process.env.NODE_ENV ?? "development";
const buildDir = `build/remix/${env}/`;

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildPath: buildDir + `server/index.js`,
  assetsBuildDirectory: buildDir + `public/build`,
  publicPath: buildDir + `public/build`,
  server: process.env.BUILD_VERCEL ? "./app/misc/vercel.ts" : undefined,
  ignoredRouteFiles: ["**/*.test.*"],
  routes: require("@remix-run/v1-route-convention").createRoutesFromFolders,
  future: {
    v2_meta: true,
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};

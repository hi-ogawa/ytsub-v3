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

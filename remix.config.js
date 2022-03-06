const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildDirectory: `build/remix/${env}/server`,
  assetsBuildDirectory: `build/remix/${env}/public/build`, // for `remix dev` server, we made a symlink `ln -sr build/remix/development/public public`
  server: process.env.BUILD_NETLIFY ? "./app/netlify.ts" : undefined,
  ignoredRouteFiles: ["**/__tests__/**/*"],
};

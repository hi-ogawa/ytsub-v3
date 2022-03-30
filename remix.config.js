const env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildPath: `build/remix/${env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${env}/public/build`, // @remix-run/serve is patched to server this directory
  server: process.env.BUILD_NETLIFY ? "./app/netlify.ts" : undefined,
  ignoredRouteFiles: ["**/__tests__/**/*"],
};

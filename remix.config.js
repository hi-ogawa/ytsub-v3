const node_env = process.env.NODE_ENV ?? "development";

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildTarget: process.env.BUILD_NETLIFY_EDGE ? "deno" : "node-cjs",
  serverBuildPath: process.env.BUILD_NETLIFY_EDGE
    ? ".netlify/edge-functions/index.js"
    : `build/remix/${node_env}/server/index.js`,
  assetsBuildDirectory: `build/remix/${node_env}/public/build`, // see @remix-run+serve+1.4.1.patch
  server: process.env.BUILD_NETLIFY_EDGE
    ? "./app/misc/netlify-edge.ts"
    : process.env.BUILD_NETLIFY
    ? "./app/misc/netlify.ts"
    : undefined,
  ignoredRouteFiles: ["**/__tests__/**/*"],
};

// 1. remix build with "deno" backend (see @remix-run+dev+1.4.1.patch)
// NODE_ENV=production BUILD_NETLIFY_EDGE=1 npx remix build
//
// 2. copy to netlify's "internal" directory and run netlify build
// netlify build

// 3. deploy
// netlify deploy

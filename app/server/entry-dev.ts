import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";
import * as build from "@remix-run/dev/server-build";
import express from "express";
import { createHattipApp } from "./entry-hattip";
import { listenPortSearchByEnv } from "./http";

async function main() {
  const app = express();
  const server = createServer(app);

  // serve client build assets
  app.use("/build", express.static(build.assetsBuildDirectory));

  // all application logic as hattip handler
  app.use(createMiddleware(createHattipApp()));

  // start app
  const port = await listenPortSearchByEnv(server);
  console.log(`[entry-dev] Server running at http://localhost:${port}`);
}

main();

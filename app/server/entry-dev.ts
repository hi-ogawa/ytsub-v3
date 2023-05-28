import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { createMiddleware } from "@hattip/adapter-node";
import express from "express";
import { listenPortSearchByEnv } from "./http";

async function main() {
  const buildPath = path.resolve(process.argv[2]);

  // require.cache trick as a cheap live reload
  function requireBuild() {
    console.log(`[entry-dev] Loading ${buildPath}`);
    delete require.cache[buildPath];
    return require(path.resolve(buildPath)) as typeof import("./entry-hattip");
  }

  // reload remix build output on nodemon's signal
  let build = requireBuild();
  fs.watch(path.dirname(buildPath), (eventType) => {
    if (eventType === "change") {
      build = undefined!;
    }
  });

  const app = express();
  const server = createServer(app);

  // serve client build assets
  app.use(
    "/build",
    express.static(build.assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use("/", express.static("./public"));

  // main app
  app.all("*", (req, res, next) => {
    build ??= requireBuild();
    return createMiddleware(build.createHattipApp())(req, res, next);
  });

  // start app
  const port = await listenPortSearchByEnv(server);
  console.log(`[entry-dev] Server running at http://localhost:${port}`);
}

main();

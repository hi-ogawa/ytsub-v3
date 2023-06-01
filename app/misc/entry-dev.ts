import { createMiddleware } from "@hattip/adapter-node";
import type { ResolvedRemixConfig } from "@remix-run/dev";
import express from "express";
import { createHattipEntry } from "./entry-hattip";

export default createDevEntry;

function createDevEntry(config: ResolvedRemixConfig) {
  const app = express();

  app.use(
    config.publicPath,
    express.static(config.assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    })
  );

  app.use(createMiddleware(createHattipEntry()));

  return app;
}

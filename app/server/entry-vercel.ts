import { createMiddleware } from "@hattip/adapter-node";
import { createHattipApp } from "./entry-hattip";

// cf. https://github.com/hattipjs/hattip/blob/03a704fa120dfe2eddd6cf22eff00c90bda2acb5/packages/bundler/bundler-vercel/readme.md

export default createVercelHanlder();

function createVercelHanlder() {
  return createMiddleware(createHattipApp(), {
    trustProxy: true,
  });
}

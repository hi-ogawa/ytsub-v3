import { createMiddleware } from "@hattip/adapter-node";
import { createHattipEntry } from "./entry-hattip";

// we can reuse express middleware both for dev and vercel (by patching @remix-run/dev)
// https://github.com/hattipjs/hattip/blob/03a704fa120dfe2eddd6cf22eff00c90bda2acb5/packages/bundler/bundler-vercel/readme.md

export default createMiddleware(createHattipEntry(), {
  trustProxy: true,
});

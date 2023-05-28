import { createMiddleware } from "@hattip/adapter-node";
import { type RequestHandler, compose } from "@hattip/compose";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";

// implement vercel serverless handler via hattip
// cf. https://github.com/hattipjs/hattip/blob/03a704fa120dfe2eddd6cf22eff00c90bda2acb5/packages/bundler/bundler-vercel/readme.md

export default createVercelHanlder();

function createVercelHanlder() {
  return createMiddleware(createHattipApp(), {
    trustProxy: true,
  });
}

// similar to https://github.com/hi-ogawa/vite-fullstack-example/blob/92649f99b041820ec86650c99cfcd49a72e79f71/src/server/hattip.ts#L16-L28

function createHattipApp() {
  return compose(createRemixHandler());
}

function createRemixHandler(): RequestHandler {
  const remixHandler = createRequestHandler(build);
  return async (ctx) => {
    const response = await remixHandler(ctx.request);
    return response;
  };
}

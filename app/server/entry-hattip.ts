import { type RequestHandler, compose } from "@hattip/compose";
import { once } from "@hiogawa/utils";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type * as hono from "hono";
import { logger } from "hono/logger";
import { initializeServer } from "../misc/initialize-server";
import { TRPC_ENDPOINT } from "../trpc/common";
import { createTrpcAppContext } from "../trpc/context";
import { trpcApp } from "../trpc/server";

// based on https://github.com/hi-ogawa/vite-fullstack-example/blob/92649f99b041820ec86650c99cfcd49a72e79f71/src/server/hattip.ts#L16-L28

export function createHattipApp() {
  return compose(
    createLogger(),
    createBootstrapHandler(),
    createTrpchandler(),
    createRemixHandler()
  );
}

// re-export for entry-dev
// ts-prune-ignore-next
export const assetsBuildDirectory = build.assetsBuildDirectory

//
// remix
//

function createRemixHandler(): RequestHandler {
  const remixHandler = createRequestHandler(build);
  return async (ctx) => {
    const response = await remixHandler(ctx.request);
    return response;
  };
}

//
// trpc
//

function createTrpchandler(): RequestHandler {
  return async (ctx) => {
    if (!ctx.url.pathname.startsWith(TRPC_ENDPOINT)) {
      return ctx.next();
    }
    return fetchRequestHandler({
      endpoint: TRPC_ENDPOINT,
      req: ctx.request,
      router: trpcApp,
      createContext: createTrpcAppContext,
      onError: (e) => {
        console.error(e);
      },
    });
  };
}

//
// bootstrap
//

function createBootstrapHandler(): RequestHandler {
  const initializeServerOnce = once(initializeServer);
  return async (ctx) => {
    await initializeServerOnce();
    return ctx.next();
  };
}

//
// logger
//

function createLogger(): RequestHandler {
  // borrow hono's logger by minimal hattip-hono compatibility layer
  // https://github.com/honojs/hono/blob/0ffd795ec6cfb67d38ab902197bb5461a4740b8f/src/middleware/logger/index.ts
  const honoLogger = logger();

  return async (ctx) => {
    let res!: Response;
    await honoLogger(
      {
        req: { method: ctx.method, raw: ctx.request },
        get res() {
          return res;
        },
      } as hono.Context,
      async () => {
        res = await ctx.next();
      }
    );
    return res;
  };
}

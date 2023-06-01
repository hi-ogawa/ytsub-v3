import { type RequestHandler, compose } from "@hattip/compose";
import { once } from "@hiogawa/utils";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Context } from "hono";
import { logger } from "hono/logger";
import { TRPC_ENDPOINT } from "../trpc/common";
import { createTrpcAppContext } from "../trpc/context";
import { trpcApp } from "../trpc/server";
import { initializeServer } from "./initialize-server";

// based on https://github.com/hi-ogawa/vite-fullstack-example/blob/92649f99b041820ec86650c99cfcd49a72e79f71/src/server/hattip.ts#L16-L28

export function createHattipEntry() {
  return compose(
    createLogger(),
    bootstrapHandler(),
    createTrpchandler(),
    createRemixHandler()
  );
}

function createRemixHandler(): RequestHandler {
  const mode =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const remixHandler = createRequestHandler(build, mode);
  return (ctx) => remixHandler(ctx.request);
}

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

function bootstrapHandler(): RequestHandler {
  const initializeServerOnce = once(initializeServer);
  return async (ctx) => {
    await initializeServerOnce();
    return ctx.next();
  };
}

function createLogger(): RequestHandler {
  // borrow hono's logger with minimal compatibility hack
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
      } as Context,
      async () => {
        res = await ctx.next();
      }
    );
    return res;
  };
}

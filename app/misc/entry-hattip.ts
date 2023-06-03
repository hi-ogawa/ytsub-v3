import { type RequestHandler, compose } from "@hattip/compose";
import { once, zip } from "@hiogawa/utils";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Context } from "hono";
import { logger } from "hono/logger";
import { TRPC_ENDPOINT } from "../trpc/common";
import { createTrpcAppContext } from "../trpc/context";
import { trpcApp } from "../trpc/server";
import { pathToRegExp } from "../utils/misc";
import { traceAsync } from "../utils/opentelemetry-utils";
import { initializeServer } from "./initialize-server";

// based on https://github.com/hi-ogawa/vite-fullstack-example/blob/92649f99b041820ec86650c99cfcd49a72e79f71/src/server/hattip.ts#L16-L28

export function createHattipEntry() {
  return compose(
    createLogger(),
    bootstrapHandler(),
    createTraceRequestHandler(),
    createTrpchandler(),
    createRemixHandler()
  );
}

//
// remix
//

function createRemixHandler(): RequestHandler {
  const mode =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const remixHandler = createRequestHandler(build, mode);
  return (ctx) => remixHandler(ctx.request);
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
        const span = trace.getActiveSpan();
        if (span) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.recordException(e.error);
        }
      },
    });
  };
}

//
// bootstrap
//

function bootstrapHandler(): RequestHandler {
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

//
// open-telemetry
//

function createTraceRequestHandler(): RequestHandler {
  const resolver = createRemixRouteResolver();

  return async (ctx) => {
    const { url } = ctx;
    return traceAsync(
      {
        name: `${ctx.method} ${resolver(url.pathname) ?? url.pathname}`,
        options: {
          kind: SpanKind.SERVER,
          attributes: {
            [SemanticAttributes.HTTP_METHOD]: ctx.method,
            [SemanticAttributes.HTTP_SCHEME]: url.protocol.slice(0, -1),
            [SemanticAttributes.HTTP_TARGET]: url.pathname + url.search,
            [SemanticAttributes.HTTP_CLIENT_IP]: ctx.ip,
            [SemanticAttributes.NET_HOST_NAME]: url.hostname,
            [SemanticAttributes.NET_HOST_PORT]: url.port,
          },
        },
      },
      async (span) => {
        const response = await ctx.next();
        span.setAttributes({
          [SemanticAttributes.HTTP_STATUS_CODE]: response.status,
        });
        return response;
      }
    );
  };
}

// resolve dynamic route pathname for opentelemetry span name
// e.g. /decks/5/practice => /decks/:id/practice
function createRemixRouteResolver() {
  const paths = Object.values(build.routes)
    .map((r) => r.path)
    .filter((r): r is string => typeof r === "string");

  const exps = paths.map((p) => pathToRegExp("/" + p));
  const mapping = new Map(zip(paths, exps));

  return (pathname: string): string | undefined => {
    for (const [k, v] of mapping) {
      if (pathname.match(v)) {
        return k;
      }
    }
    return;
  };
}

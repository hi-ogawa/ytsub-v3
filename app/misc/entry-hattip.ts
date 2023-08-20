import { type RequestHandler, compose } from "@hattip/compose";
import { once } from "@hiogawa/utils";
import { createLoggerHandler } from "@hiogawa/utils-hattip";
import { SpanKind } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";
import { requestContextHandler } from "../server/request-context";
import { rpcHandler } from "../trpc/server";
import { pathToRegExp } from "../utils/misc";
import { traceAsync } from "../utils/opentelemetry-utils";
import { initializeServer } from "./initialize-server";

// based on https://github.com/hi-ogawa/vite-fullstack-example/blob/92649f99b041820ec86650c99cfcd49a72e79f71/src/server/hattip.ts#L16-L28

export function createHattipEntry() {
  return compose(
    createLoggerHandler(),
    bootstrapHandler(),
    createTraceRequestHandler(),
    requestContextHandler(),
    rpcHandler(),
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
    .filter((r): r is string => typeof r === "string")
    .map((r) => "/" + r);

  const mapping = new Map(
    paths.map((p) => [p, pathToRegExp(p).regexp] as const)
  );

  return (pathname: string): string | undefined => {
    for (const [k, v] of mapping) {
      if (pathname.match(v)) {
        return k;
      }
    }
    return;
  };
}

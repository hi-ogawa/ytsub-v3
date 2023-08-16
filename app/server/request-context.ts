import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext, RequestHandler } from "@hattip/compose";
import { tinyassert } from "@hiogawa/utils";

// cf.
// https://github.com/hi-ogawa/vite-plugins/blob/af678d076200dac924cb0c2dda5746505ca869d2/packages/demo/src/server/request-context.ts
// https://github.com/hi-ogawa/vite-plugins/blob/af678d076200dac924cb0c2dda5746505ca869d2/packages/demo/src/server/session.ts

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext() {
  const value = requestContextStorage.getStore();
  tinyassert(value, `forgot to setup '${requestContextStorageHandler.name}'?`);
  return value;
}

export function requestContextStorageHandler(): RequestHandler {
  return async (ctx) => requestContextStorage.run(ctx, () => ctx.next());
}

//
// allow manipulating response headers via context
// e.g. for set-cookie, cache-control, ...
//

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    responseHeaders: Headers;
  }
}

export function responseHeadersContextHandler(): RequestHandler {
  return async (ctx) => {
    ctx.responseHeaders = new Headers();
    const res = await ctx.next();
    ctx.responseHeaders.forEach((v, k) => {
      res.headers.set(k, v);
    });
    return res;
  };
}

// full cache only on CDN (cf. https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching)
export function cacheResponse(headers: Headers) {
  headers.set("cache-control", "public, max-age=0, s-max-age=31536000");
}

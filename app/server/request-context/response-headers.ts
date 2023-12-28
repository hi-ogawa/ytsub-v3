import type { RequestHandler } from "@hattip/compose";
import { ctx_get } from "#server/request-context/storage";

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

export function ctx_cacheResponse() {
  // full cache only on CDN (cf. https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching)
  ctx_get().responseHeaders.set(
    "cache-control",
    "public, max-age=0, s-max-age=31536000"
  );
}

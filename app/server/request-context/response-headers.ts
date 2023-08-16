import type { RequestHandler } from "@hattip/compose";

//
// allow manipulating response headers via context
// e.g. for set-cookie, cache-control, ...
//

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    responseHeaders: Headers;
    setResponseHeader: (k: HeaderKeys, v: string | null) => void;
  }
}

type HeaderKeys = "cache-control" | "set-cookie";

export function responseHeadersContextHandler(): RequestHandler {
  return async (ctx) => {
    ctx.responseHeaders = new Headers();
    ctx.setResponseHeader = (k, v) => {
      if (v === null) {
        ctx.responseHeaders.delete(k);
      } else {
        ctx.responseHeaders.set(k, v);
      }
    };
    const res = await ctx.next();
    ctx.responseHeaders.forEach((v, k) => {
      res.headers.set(k, v);
    });
    return res;
  };
}

export const CACHE_CONTROL = {
  // full cache only on CDN (cf. https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching)
  cdn: "public, max-age=0, s-max-age=31536000",
};

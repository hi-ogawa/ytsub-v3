import type { RequestHandler } from "@hattip/compose";
import { Params } from "@remix-run/react";

// allow accessing loader route "params" via context

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    params: Params;
    urlQuery: Record<string, string>;
  }
}

export function routeParamsContextHandler(): RequestHandler {
  return async (ctx) => {
    // `params` needs to be injected later by `wrapLoader`
    ctx.params = new Proxy(
      {},
      {
        get(_target, _p, _receiver) {
          throw new Error("forgot 'wrapLoader'?");
        },
      }
    );
    ctx.urlQuery = Object.fromEntries(ctx.url.searchParams.entries());
    return ctx.next();
  };
}

import type { RequestHandler } from "@hattip/compose";
import { Params } from "@remix-run/react";

// allow accessing loader route "params" via context

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    params: Params;
  }
}

export function routeParamsContextHandler(): RequestHandler {
  return async (ctx) => {
    ctx.params = new Proxy(
      {},
      {
        get(_target, _p, _receiver) {
          throw new Error("forgot 'makeLoader'?");
        },
      }
    );
    return ctx.next();
  };
}

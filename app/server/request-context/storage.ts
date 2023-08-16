import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext, RequestHandler } from "@hattip/compose";
import { tinyassert } from "@hiogawa/utils";

// cf.
// https://github.com/hi-ogawa/vite-plugins/blob/af678d076200dac924cb0c2dda5746505ca869d2/packages/demo/src/server/request-context.ts
// https://github.com/hi-ogawa/vite-plugins/blob/af678d076200dac924cb0c2dda5746505ca869d2/packages/demo/src/server/session.ts

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function requestContextStorageHandler(): RequestHandler {
  return async (ctx) => requestContextStorage.run(ctx, () => ctx.next());
}

export function ctx_get() {
  const value = requestContextStorage.getStore();
  tinyassert(value, `forgot to setup '${requestContextStorageHandler.name}'?`);
  return value;
}

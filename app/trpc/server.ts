import { RequestHandler } from "@hattip/compose";
import { exposeTinyRpc, httpServerAdapter } from "@hiogawa/tiny-rpc";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { JSON_EXTRA } from "../utils/json-extra";
import { RPC_ENDPOINT, RPC_GET_PATHS } from "./common";
import { rpcRoutesBookmarks } from "./routes/bookmarks";
import { rpcRoutesDecks } from "./routes/decks";
import { rpcRoutesUsers } from "./routes/users";
import { rpcRoutesVideos } from "./routes/videos";

export const rpcRoutes = {
  ...rpcRoutesDecks,
  ...rpcRoutesBookmarks,
  ...rpcRoutesVideos,
  ...rpcRoutesUsers,
};

export function rpcHandler(): RequestHandler {
  return exposeTinyRpc({
    routes: rpcRoutes,
    adapter: httpServerAdapter({
      endpoint: RPC_ENDPOINT,
      pathsForGET: RPC_GET_PATHS satisfies (keyof typeof rpcRoutes)[],
      JSON: {
        // only extend server -> client payload
        stringify: JSON_EXTRA.stringify,
      },
      onError(e) {
        console.error(e);
        const span = trace.getActiveSpan();
        if (span) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.recordException(e as Error);
        }
      },
    }),
  });
}

// fix up Function.name so that it can be used as a test title e.g.
//   describe(rpcRoutes.users_singin, () => {})
for (const [k, v] of Object.entries(rpcRoutes)) {
  Object.defineProperty(v, "name", { value: k });
}

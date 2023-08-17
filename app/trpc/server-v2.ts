import { RequestHandler } from "@hattip/compose";
import {
  TinyRpcRoutes,
  exposeTinyRpc,
  httpServerAdapter,
} from "@hiogawa/tiny-rpc";
import { RPC_ENDPOINT, RPC_GET_PATHS } from "./client-v2";
import { rpcRoutesBookmarks } from "./routes/bookmarks";
import { rpcRoutesUsers } from "./routes/users";
import { rpcRoutesVideos } from "./routes/videos";

export const rpcRoutes = {
  ...rpcRoutesBookmarks,
  ...rpcRoutesVideos,
  ...rpcRoutesUsers,
  // ts-prune-ignore-next (satisfies unsupported)
} satisfies TinyRpcRoutes;

export function rpcHandler(): RequestHandler {
  return exposeTinyRpc({
    routes: rpcRoutes,
    adapter: httpServerAdapter({
      endpoint: RPC_ENDPOINT,
      pathsForGET: RPC_GET_PATHS,
      onError(e) {
        console.error(e);
      },
    }),
  });
}

// fix up Function.name so that it can be used as a test title e.g.
//   describe(rpcRoutes.users_singin.name, () => {})
for (const [k, v] of Object.entries(rpcRoutes)) {
  Object.defineProperty(v, "name", { value: k });
}

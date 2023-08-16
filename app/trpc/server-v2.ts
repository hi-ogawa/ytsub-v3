import { RequestHandler } from "@hattip/compose";
import {
  TinyRpcRoutes,
  exposeTinyRpc,
  httpServerAdapter,
} from "@hiogawa/tiny-rpc";
import { RPC_ENDPOINT, RPC_GET_PATHS } from "./client-v2";
import { rpcRoutesVideos } from "./routes/videos";

export const rpcRoutes = {
  ...rpcRoutesVideos,
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

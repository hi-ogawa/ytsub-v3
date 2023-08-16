import { RequestHandler } from "@hattip/compose";
import {
  TinyRpcRoutes,
  exposeTinyRpc,
  httpServerAdapter,
} from "@hiogawa/tiny-rpc";
import { RPC_ENDPOINT } from "./client-v2";
import { rpcRoutesVideos } from "./routes/videos";

export const rpcRoutes = {
  ...rpcRoutesVideos,
} satisfies TinyRpcRoutes;

export function rpcHandler(): RequestHandler {
  return exposeTinyRpc({
    routes: rpcRoutes,
    adapter: httpServerAdapter({
      endpoint: RPC_ENDPOINT,
      method: "GET",
      onError(e) {
        console.error(e);
      },
    }),
  });
}

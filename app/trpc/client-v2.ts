import { createFnRecordQueryProxy } from "@hiogawa/query-proxy";
import { httpClientAdapter, proxyTinyRpc } from "@hiogawa/tiny-rpc";
import { type rpcRoutes } from "./server-v2";

export const RPC_ENDPOINT = "/rpc";
export const RPC_GET_PATHS: (keyof typeof rpcRoutes)[] = [
  "videos_getCaptionEntries",
];

const rpcClient = proxyTinyRpc<typeof rpcRoutes>({
  adapter: httpClientAdapter({
    url: RPC_ENDPOINT,
    pathsForGET: RPC_GET_PATHS,
  }),
});

export const rpcClientQuery = createFnRecordQueryProxy(rpcClient);
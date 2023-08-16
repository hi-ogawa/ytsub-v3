import { createFnRecordQueryProxy } from "@hiogawa/query-proxy";
import { httpClientAdapter, proxyTinyRpc } from "@hiogawa/tiny-rpc";
import { type rpcRoutes } from "./server-v2";

export const RPC_ENDPOINT = "/rpc";

// TODO: merge interface of GET and POST endpoint into one?
//       just "merge Proxy" instead of "object spreads"

const rpcClient = proxyTinyRpc<typeof rpcRoutes>({
  adapter: httpClientAdapter({
    url: RPC_ENDPOINT,
    method: "GET",
  }),
});

export const rpcClientQuery = createFnRecordQueryProxy(rpcClient);

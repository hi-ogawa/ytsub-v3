import { createFnRecordQueryProxy } from "@hiogawa/query-proxy";
import { httpClientAdapter, proxyTinyRpc } from "@hiogawa/tiny-rpc";
import { RPC_ENDPOINT, RPC_GET_PATHS } from "#trpc/common";
import { type rpcRoutes } from "#trpc/server";
import { JSON_EXTRA } from "#utils/json-extra";

export const rpcClient = proxyTinyRpc<typeof rpcRoutes>({
  adapter: httpClientAdapter({
    url: RPC_ENDPOINT,
    pathsForGET: RPC_GET_PATHS,
    JSON: {
      parse: JSON_EXTRA.parse,
    },
  }),
});

export const rpcClientQuery = createFnRecordQueryProxy(rpcClient);

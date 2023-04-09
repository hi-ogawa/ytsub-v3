import { createTRPCProxyClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { trpcApp } from "./server";

// cf. https://trpc.io/docs/client/setup

// we cannot tree-shake from server bundle for idiomatic use of `useMutation(trpcClient.xxx.mutate)`
export const trpcClient = createTRPCProxyClient<typeof trpcApp>({
  transformer: superjson,
  links: [
    httpLink({
      url: "/trpc",
    }),
  ],
});

//
// toy version of https://trpc.io/docs/reactjs/introduction
//

type TrpcRoutes = (typeof trpcApp)["_def"]["record"];

type TrpcQueryRoutes = {
  [K in keyof TrpcRoutes]: TrpcRoutes[K]["_type"] extends "query" ? K : never;
}[keyof TrpcRoutes];

type TrpcIO = {
  [K in keyof TrpcRoutes]: {
    i: TrpcRoutes[K]["_def"]["_input_in"];
    o: TrpcRoutes[K]["_def"]["_output_out"];
  };
};

export function trpcQueryOptions<K extends TrpcQueryRoutes>(
  k: K,
  i: TrpcIO[K]["i"]
) {
  return {
    queryKey: ["trpc", k, i],
    queryFn: () => (trpcClient as any)[k].query(i) as Promise<TrpcIO[K]["o"]>,
  };
}

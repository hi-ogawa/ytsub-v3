import { createTRPCProxyClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { trpcApp } from "./server";

// cf. https://trpc.io/docs/client/setup

const trpcClient = createTRPCProxyClient<typeof trpcApp>({
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

type TRecord = (typeof trpcApp)["_def"]["record"];

type KeyOfIf<T, IfV> = {
  [K in keyof T]: T[K] extends IfV ? K : never;
}[keyof T];

export function trpcQueryOptions<
  K extends KeyOfIf<TRecord, { _type: "query" }>,
  I = TRecord[K]["_def"]["_input_in"],
  O = TRecord[K]["_def"]["_output_out"]
>(k: K, i: I) {
  return {
    queryKey: ["trpc", k, i],
    queryFn: () => (trpcClient as any)[k].query(i) as Promise<O>,
  };
}

export function trpcMutationOptions<
  K extends KeyOfIf<TRecord, { _type: "mutation" }>,
  I = TRecord[K]["_def"]["_input_in"],
  O = TRecord[K]["_def"]["_output_out"]
>(k: K) {
  return {
    mutationKey: ["trpc", k],
    mutationFn: (i: I) => (trpcClient as any)[k].mutate(i) as Promise<O>,
  };
}

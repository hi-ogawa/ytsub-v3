import { createGetProxy } from "../utils/misc";
import { trpcClient } from "./client-internal.client";
import type { trpcApp } from "./server";

//
// quick and dirty react-query integration (cf. https://trpc.io/docs/reactjs/introduction)
//

type TRecord = (typeof trpcApp)["_def"]["record"];
type TInput<K extends keyof TRecord> = TRecord[K]["_def"]["_input_in"];
type TOutput<K extends keyof TRecord> = TRecord[K]["_def"]["_output_out"];

// prettier-ignore
export const trpc =
  createGetProxy((k) =>
    createGetProxy(prop => {
      if (prop === "queryKey" || prop === "mutationKey") {
        return k;
      }
      if (prop === "queryOptions") {
        return (input: unknown) => ({
          queryKey: [k, input],
          queryFn: () => (trpcClient as any)[k].query(input),
        })
      }
      if (prop === "mutationOptions") {
        return () => ({
          mutationKey: [k],
          mutationFn: (input: unknown) => (trpcClient as any)[k].mutate(input),
        })
      }
      console.error({ k, prop });
      throw new Error("invalid trpc react-query call");
    })
  ) as TrpcProxy;

type TrpcProxy = {
  [K in keyof TRecord]: {
    queryKey: K;
    queryOptions: (input: TInput<K>) => {
      queryKey: unknown[];
      queryFn: () => Promise<TOutput<K>>;
    };
    mutationKey: K;
    mutationOptions: () => {
      mutationKey: unknown[];
      mutationFn: (input: TInput<K>) => Promise<TOutput<K>>;
    };
  };
};

import type { GetNextPageParamFunction } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createGetProxy } from "../utils/misc";
import { trpcClient } from "./client-internal.client";
import type { trpcApp } from "./server";

//
// quick and dirty react-query integration (super simplified version of https://trpc.io/docs/reactjs/introduction)
//

type Inputs = inferRouterInputs<typeof trpcApp>;
type Outputs = inferRouterOutputs<typeof trpcApp>;

export { Inputs as TrpcInputs };

type ReactQueryIntegration = {
  [K in keyof Inputs]: {
    queryKey: K;
    queryOptions: (input: Inputs[K]) => {
      queryKey: unknown[];
      queryFn: () => Promise<Outputs[K]>;
    };
    infiniteQueryOptions: (
      input: Inputs[K],
      options: {
        getNextPageParam: GetNextPageParamFunction<Outputs[K]>;
        setPageParam: (input: Inputs[K], pageParam: unknown) => Inputs[K];
      }
    ) => {
      queryKey: unknown[];
      queryFn: (context: unknown) => Promise<Outputs[K]>;
      getNextPageParam: any;
    };
    mutationKey: K;
    mutationOptions: () => {
      mutationKey: unknown[];
      mutationFn: (input: Inputs[K]) => Promise<Outputs[K]>;
    };
  };
};

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
      if (prop === "infiniteQueryOptions") {
        return (input: unknown, options: any) => ({
          queryKey: [k, input],
          queryFn: ({ pageParam }: any) => (trpcClient as any)[k].query(options.setPageParam(input, pageParam)),
          getNextPageParam: options.getNextPageParam,
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
  ) as ReactQueryIntegration;

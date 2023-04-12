import { tinyassert } from "@hiogawa/utils";
import { createGetProxy } from "../utils/proxy-utiils";
import { _trpc } from "./client-internal.client";
import type { TrpcInput, TrpcOutput, TrpcRecord, TrpcType } from "./types";

//
// quick and dirty flat route version of https://trpc.io/docs/reactjs/introduction
//

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
          queryFn: () => (_trpc as any)[k].query(input),
        })
      }
      if (prop === "mutationOptions") {
        return () => ({
          mutationKey: [k],
          mutationFn: (input: unknown) => (_trpc as any)[k].mutate(input),
        })
      }
      tinyassert(false, "unreachable");
    })
  ) as TrpcProxy;

// prettier-ignore
type TrpcProxy = {
  [K in keyof TrpcRecord]:
    TrpcType[K] extends "query"
    ? {
        queryKey: K;
        queryOptions: (input: TrpcInput[K]) => {
          queryKey: unknown[];
          queryFn: () => Promise<TrpcOutput[K]>;
        }
      }
  : TrpcType[K] extends "mutation"
    ? {
        mutationKey: K;
        mutationOptions: () => {
          mutationKey: unknown[];
          mutationFn: (input: TrpcInput[K]) => Promise<TrpcOutput[K]>;
        }
      }
  : never
}

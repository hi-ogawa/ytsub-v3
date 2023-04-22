import { tinyassert } from "@hiogawa/utils";
import { createGetProxy } from "../utils/misc";
import { _trpc } from "./client-internal.client";
import type { trpcApp } from "./server";

//
// quick and dirty flat route version of https://trpc.io/docs/reactjs/introduction
//

type TRecord = (typeof trpcApp)["_def"]["record"];
type TType<K extends keyof TRecord> = TRecord[K]["_type"];
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
  [K in keyof TRecord]:
    TType<K> extends "query"
    ? {
        queryKey: K;
        queryOptions: (input: TInput<K>) => {
          queryKey: unknown[];
          queryFn: () => Promise<TOutput<K>>;
        }
      }
  : TType<K> extends "mutation"
    ? {
        mutationKey: K;
        mutationOptions: () => {
          mutationKey: unknown[];
          mutationFn: (input: TInput<K>) => Promise<TOutput<K>>;
        }
      }
  : never
}
import { tinyassert } from "@hiogawa/utils";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { trpcApp } from "./server";

const trpcClient = createTRPCProxyClient<typeof trpcApp>({
  transformer: superjson,
  links: [
    httpLink({
      url: "/trpc",
    }),
  ],
});

//
// quick and dirty flat route version of https://trpc.io/docs/reactjs/introduction
//

type TRecord = (typeof trpcApp)["_def"]["record"];
type TType<K extends keyof TRecord> = TRecord[K]["_type"];
type TInput<K extends keyof TRecord> = TRecord[K]["_def"]["_input_in"];
type TOutput<K extends keyof TRecord> = TRecord[K]["_def"]["_output_out"];

// prettier-ignore
export const trpc =
  createProxy((k) =>
    createProxy(prop => {
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
      tinyassert(false, "unreachable");
    })
  ) as {
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
};

function createProxy(propHandler: (prop: string | symbol) => unknown): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop, _receiver) {
        return propHandler(prop);
      },
    }
  );
}

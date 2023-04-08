import { createTRPCProxyClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { trpcApp } from "./app.server";

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

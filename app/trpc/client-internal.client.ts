import { createTRPCProxyClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { trpcApp } from "./server";

// remove raw client from server bundle since it's not meant to be used on server.
// if we even try, we would better get an error.

export const _trpc = createTRPCProxyClient<typeof trpcApp>({
  transformer: superjson,
  links: [
    httpLink({
      url: "/trpc",
    }),
  ],
});

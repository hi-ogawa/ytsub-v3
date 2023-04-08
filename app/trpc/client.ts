import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { trpcAppRouter } from "./app.server";

// cf. https://trpc.io/docs/client/setup

export const trpcClient = createTRPCProxyClient<typeof trpcAppRouter>({
  links: [
    httpLink({
      url: "/trpc",
    }),
  ],
});

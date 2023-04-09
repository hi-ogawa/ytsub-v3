import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcAppContext } from "./context";

// dedicated factory exports to break dependency cycle

const t = initTRPC.context<TrpcAppContext>().create({
  transformer: superjson,
});

export const routerFactory = t.router;
export const middlewareFactory = t.middleware;
export const procedureBuilder = t.procedure;

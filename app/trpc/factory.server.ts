import { initTRPC } from "@trpc/server";
import type { TrpcAppContext } from "./context.server";

// dedicated factory exports to break dependency cycle

const t = initTRPC.context<TrpcAppContext>().create();

export const routerFactory = t.router;
export const middlewareFactory = t.middleware;
export const procedureBuilder = t.procedure;

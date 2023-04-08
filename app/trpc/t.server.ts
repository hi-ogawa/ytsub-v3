import { initTRPC } from "@trpc/server";
import type { TrpcAppContext } from "./context.server";

export const t = initTRPC.context<TrpcAppContext>().create();

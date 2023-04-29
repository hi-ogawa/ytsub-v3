import type { DataFunctionArgs } from "@remix-run/server-runtime";
import { createTrpcAppContext } from "./context";
import { trpcApp } from "./server";

// cf. testTrpcClientWithContext
export async function createLoaderTrpc(loaderArgs: DataFunctionArgs) {
  const ctx = await createTrpcAppContext({
    req: loaderArgs.request,
    resHeaders: new Headers(),
    loaderArgs: loaderArgs,
  });
  const caller = trpcApp.createCaller(ctx);
  return { caller, ctx };
}

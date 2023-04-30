import type {
  DataFunctionArgs,
  LoaderFunction,
} from "@remix-run/server-runtime";
import { createTrpcAppContext } from "../trpc/context";

export function makeLoaderImpl(
  inner: (args: { ctx: LoaderContext }) => unknown
): LoaderFunction {
  return async (loaderArgs) => {
    const ctx = await createLoaderContext(loaderArgs);
    return ctx.redirectOnError(() => inner({ ctx }));
  };
}

//
// extending the idea of trpc context for remix loader
//

export type LoaderContext = Awaited<ReturnType<typeof createLoaderContext>>;

async function createLoaderContext(loaderArgs: DataFunctionArgs) {
  const { request: req } = loaderArgs;
  const resHeaders = new Headers();

  const trpcCtx = await createTrpcAppContext({
    req,
    resHeaders,
  });

  const ctx = {
    ...trpcCtx,
    params: loaderArgs.params,
  };

  return ctx;
}

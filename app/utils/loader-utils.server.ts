import {
  DataFunctionArgs,
  LoaderFunction,
  redirect,
} from "@remix-run/server-runtime";
import { serialize } from "superjson";
import { $R } from "../misc/routes";
import { createTrpcAppContext } from "../trpc/context";
import { getSessionUser } from "./auth";
import { FlashMessage, pushFlashMessage } from "./flash-message";

export function makeLoaderImpl(
  inner: (args: { ctx: LoaderContext }) => unknown
): LoaderFunction {
  return async (loaderArgs) => {
    // TODO: wrap with `superjson.serialize` by default.
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

    query: Object.fromEntries(
      new URLSearchParams(new URL(req.url).search).entries()
    ),

    flash: async (message: FlashMessage) => {
      pushFlashMessage(ctx.session, message);
      await ctx.commitSession();
    },

    redirect: (url: string) => {
      return redirect(url, { headers: resHeaders });
    },

    requireUser: async () => {
      const user = await getSessionUser(ctx.session);
      if (!user) {
        await ctx.flash({ content: "Signin required", variant: "error" });
        throw ctx.redirect($R["/users/signin"]());
      }
      return user;
    },

    async redirectOnError<T>(f: () => T, url?: string) {
      try {
        return await f();
      } catch (e) {
        if (e instanceof Response) {
          throw e;
        }
        await ctx.flash({ content: "Invalid request", variant: "error" });
        throw ctx.redirect(url ?? $R["/"]());
      }
    },

    serialize(data: unknown): unknown {
      return serialize(data);
    },
  };

  return ctx;
}

import {
  DataFunctionArgs,
  LoaderFunction,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { serialize } from "superjson";
import { $R } from "../misc/routes";
import { createTrpcAppContext } from "../trpc/context";
import { getSessionUser } from "./auth";
import {
  FlashMessage,
  getFlashMessages,
  pushFlashMessage,
} from "./flash-message";

// tree-shake from client bundle via `pureCommentPlugin`
export function makeLoader(
  inner: (args: { ctx: LoaderContext }) => unknown
): LoaderFunction {
  return async (loaderArgs) => {
    const ctx = await createLoaderContext(loaderArgs);
    return ctx.redirectOnError(async () => {
      let resRaw = await inner({ ctx });
      const res = resRaw instanceof Response ? resRaw : json(serialize(resRaw));
      return ctx.__finalizeResponse(res);
    });
  };
}

export type LoaderContext = Awaited<ReturnType<typeof createLoaderContext>>;

async function createLoaderContext(loaderArgs: DataFunctionArgs) {
  const { request: req } = loaderArgs;
  const resHeaders = new Headers();
  const reqUrl = new URL(req.url);

  const trpcCtx = await createTrpcAppContext({
    req,
    resHeaders,
  });

  const ctx = {
    ...trpcCtx,

    params: loaderArgs.params,

    query: Object.fromEntries(reqUrl.searchParams.entries()),

    flash: async (message: FlashMessage) => {
      pushFlashMessage(ctx.session, message);
      await ctx.commitSession();
    },

    getFlashMessages: async () => {
      const flashMessages = getFlashMessages(ctx.session);
      if (flashMessages.length > 0) {
        await ctx.commitSession();
      }
      return flashMessages;
    },

    currentUser: () => {
      return getSessionUser(ctx.session);
    },

    requireUser: async () => {
      const user = await ctx.currentUser();
      if (!user) {
        await ctx.flash({ content: "Signin required", variant: "error" });
        throw redirect($R["/users/signin"]());
      }
      return user;
    },

    async redirectOnError<T>(f: () => T, destUrl: string = $R["/"]()) {
      try {
        return await f();
      } catch (error) {
        let res: Response;
        if (error instanceof Response) {
          res = error;
        } else {
          // root redirection as default error handling unless infinite redirection
          if (reqUrl.pathname + reqUrl.search === destUrl) {
            throw new Error("redirectOnError (infinite redirection detected)");
          }
          await ctx.flash({ content: "Invalid request", variant: "error" });
          res = redirect(destUrl);
        }
        throw ctx.__finalizeResponse(res);
      }
    },

    __finalizeResponse: (res: Response): Response => {
      mergeHeaders(res.headers, resHeaders);
      return res;
    },
  };

  return ctx;
}

function mergeHeaders(dst: Headers, src: Headers) {
  src.forEach((value, key) => {
    dst.set(key, value);
  });
}

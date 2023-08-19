import {
  DataFunctionArgs,
  LoaderFunction,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { serialize } from "superjson";
import { $R } from "../misc/routes";
import { ctx_currentUser } from "../server/request-context/session";
import { ctx_get } from "../server/request-context/storage";
import { encodeFlashMessage } from "./flash-message";

// TODO
// - replace LoaderContext with async storage `ctx_xxx` helper
// - loader error redirection logic can be moved to client error boundary?

// tree-shake from client bundle via `pureCommentPlugin`
export function makeLoader(
  inner: (args: { ctx: LoaderContext }) => unknown
): LoaderFunction {
  return async (loaderArgs) => {
    const ctx = await createLoaderContext(loaderArgs);
    return ctx.redirectOnError(async () => {
      let resRaw = await inner({ ctx });
      const res = resRaw instanceof Response ? resRaw : json(serialize(resRaw));
      return res;
    });
  };
}

export type LoaderContext = Awaited<ReturnType<typeof createLoaderContext>>;

async function createLoaderContext({ params }: DataFunctionArgs) {
  const { url } = ctx_get();

  return {
    params,

    query: Object.fromEntries(url.searchParams.entries()),

    currentUser: () => ctx_currentUser(),

    requireUser: async () => {
      const user = await ctx_currentUser();
      if (!user) {
        throw redirect(
          $R["/users/signin"]() +
            "?" +
            encodeFlashMessage({ content: "Signin required", variant: "error" })
        );
      }
      return user;
    },

    async redirectOnError<T>(f: () => T) {
      try {
        return await f();
      } catch (error) {
        let res: Response;
        if (error instanceof Response) {
          res = error;
        } else {
          console.error("redirectOnError", error);

          // redirect to root unless infinite redirection
          if (url.pathname === "/") {
            throw new Error("redirectOnError (infinite redirection detected)");
          }
          res = redirect(
            $R["/"]() +
              "?" +
              encodeFlashMessage({
                content: "Invalid request",
                variant: "error",
              })
          );
        }
        throw res;
      }
    },
  };
}

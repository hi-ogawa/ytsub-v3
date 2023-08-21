import {
  DataFunctionArgs,
  LoaderArgs,
  LoaderFunction,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { serialize } from "superjson";
import { $R } from "../misc/routes";
import { ctx_currentUser } from "../server/request-context/session";
import { ctx_get } from "../server/request-context/storage";
import { encodeFlashMessage } from "./flash-message";

// - setup route "params" in async context
// - custom json serializer by default
export function wrapLoader(loader: () => unknown) {
  return async ({ params }: LoaderArgs) => {
    ctx_get().params = params;
    const res = await loader();
    return res instanceof Response ? res : json(serialize(res));
  };
}

// TODO
// - replace LoaderContext with async storage `ctx_xxx` helper
// - loader error redirection logic can be moved to client error boundary?

// tree-shake from client bundle via `pureCommentPlugin`
export function makeLoader(
  inner: (args: { ctx: LoaderContext }) => unknown
): LoaderFunction {
  return async (loaderArgs) => {
    ctx_get().params = loaderArgs.params;
    const ctx = await createLoaderContext(loaderArgs);
    return ctx.redirectOnError(async () => {
      let resRaw = await inner({ ctx });
      const res = resRaw instanceof Response ? resRaw : json(serialize(resRaw));
      return res;
    });
  };
}

export type LoaderContext = Awaited<ReturnType<typeof createLoaderContext>>;

async function createLoaderContext({}: DataFunctionArgs) {
  const { url } = ctx_get();

  return {
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

//
// error response helpers
//

export function assertOrRespond(v: unknown, status: number = 404): asserts v {
  if (!v) {
    throw json(null, { status });
  }
}

// export function unwrapOrRespond<T>(v: T, status: number) {
//   if (!v) {
//     throw json(null, { status });
//   }
//   return v;
// }

// export function unwrapResultOrRespond<T1, T2>(
//   v: { ok: true; value: T1 } | { ok: false; value: T2 },
//   status: number = 400
// ) {
//   if (!v.ok) {
//     throw json(null, { status });
//   }
//   return v.value;
// }

export function unwrapZodResultOrRespond<T1, T2>(
  v: { success: true; data: T1 } | { success: false; error: T2 },
  status: number = 400
) {
  if (!v.success) {
    throw json(null, { status });
  }
  return v.data;
}

export async function ctx_requireUserOrRedirect() {
  const user = await ctx_currentUser();
  if (!user) {
    // TODO: reloadDocument?
    throw redirect(
      $R["/users/signin"]() +
        "?" +
        encodeFlashMessage({ content: "Signin required", variant: "error" })
    );
  }
  return user;
}

import { tinyassert } from "@hiogawa/utils";
import { DataFunctionArgs, redirect } from "@remix-run/server-runtime";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { TT } from "../db/drizzle-client.server";
import { $R } from "../misc/routes";
import { getSessionUser } from "../utils/auth";
import { FlashMessage, pushFlashMessage } from "../utils/flash-message";
import { none } from "../utils/misc";
import {
  getRequestSession,
  getResponseSession,
  sessionStore,
} from "../utils/session.server";
import { middlewareFactory } from "./factory";

export type TrpcAppContext = Awaited<ReturnType<typeof createTrpcAppContext>>;

export const createTrpcAppContext = async ({
  req,
  resHeaders,
  loaderArgs,
}: FetchCreateContextFnOptions & { loaderArgs?: DataFunctionArgs }) => {
  const ctx = {
    session: await getRequestSession(req),

    user: none<TT["users"]>(),

    commitSession: async () => {
      resHeaders.set(
        "set-cookie",
        await sessionStore.commitSession(ctx.session)
      );
    },

    cacheResponse: () => {
      // full cache only on CDN (cf. https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching)
      resHeaders.set("cache-control", "public, max-age=0, s-max-age=31536000");
    },

    //
    // for remix loader
    //

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

    get loaderParams() {
      tinyassert(loaderArgs);
      return loaderArgs.params;
    },

    get loaderQuery() {
      return Object.fromEntries(
        new URLSearchParams(new URL(req.url).search).entries()
      );
    },

    //
    // for testing
    //

    __getRepsonseSession: () => {
      return getResponseSession({ headers: resHeaders });
    },
  };

  return ctx;
};

//
// middlewares
//

const currentUser = middlewareFactory(async ({ ctx, next }) => {
  const user = await getSessionUser(ctx.session);
  return next({
    ctx: { user },
  });
});

const requireUser = middlewareFactory(async ({ ctx, next }) => {
  const user = await getSessionUser(ctx.session);
  tinyassert(user, "require user");
  return next({
    ctx: { user },
  });
});

export const middlewares = { requireUser, currentUser };

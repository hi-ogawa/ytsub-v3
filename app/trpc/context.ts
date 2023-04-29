import { tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { TT } from "../db/drizzle-client.server";
import { getSessionUser } from "../utils/auth";
import { FlashMessage, pushFlashMessage } from "../utils/flash-message";
import {
  getRequestSession,
  getResponseSession,
  sessionStore,
} from "../utils/session.server";
import { middlewareFactory } from "./factory";

export type TrpcAppContext = {
  session: Session;
  flash: (message: FlashMessage) => Promise<void>;
  commitSession: () => Promise<void>;
  cacheResponse: () => void;
  __getRepsonseSession: () => Promise<Session>; // for testing
  user?: TT["users"];
};

export const createTrpcAppContext = async ({
  req,
  resHeaders,
}: FetchCreateContextFnOptions): Promise<TrpcAppContext> => {
  const ctx: TrpcAppContext = {
    session: await getRequestSession(req),

    user: undefined,

    flash: async (message) => {
      pushFlashMessage(ctx.session, message);
      await ctx.commitSession();
    },

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

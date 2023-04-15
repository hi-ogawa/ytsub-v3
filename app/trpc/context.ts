import { tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { TT } from "../db/drizzle-client.server";
import { getSessionUser } from "../utils/auth";
import { FlashMessage, pushFlashMessage } from "../utils/flash-message";
import { getRequestSession, sessionStore } from "../utils/session.server";
import { middlewareFactory } from "./factory";

export type TrpcAppContext = {
  session: Session;
  resHeaders: Headers; // for testing
  commitSession: () => Promise<void>;
  flush: (message: FlashMessage) => void; // just an idea but not used yet and hopefully this won't be necessary
  user?: TT["users"];
};

export const createTrpcAppContext = async ({
  req,
  resHeaders,
}: FetchCreateContextFnOptions): Promise<TrpcAppContext> => {
  const session = await getRequestSession(req);
  return {
    session,
    resHeaders,
    flush: async (message) => {
      pushFlashMessage(session, message);
    },
    commitSession: async () => {
      resHeaders.set("set-cookie", await sessionStore.commitSession(session));
    },
  };
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

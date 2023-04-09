import { tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { TT } from "../db/drizzle-client.server";
import { getSessionUser } from "../utils/auth";
import { getRequestSession } from "../utils/session-utils";
import { middlewareFactory } from "./factory";

export type TrpcAppContext = {
  session: Session;
  user?: TT["users"];
};

export const createTrpcAppContext = async ({
  req,
}: FetchCreateContextFnOptions): Promise<TrpcAppContext> => {
  const session = await getRequestSession(req);
  return {
    session,
  };
};

//
// middlewares
//

const requireUser = middlewareFactory(async ({ ctx, next }) => {
  const user = await getSessionUser(ctx.session);
  tinyassert(user, "require user");
  return next({
    ctx: { user },
  });
});

export const middlewares = { requireUser };

import { RequestHandler } from "@hattip/compose";
import { tinyassert } from "@hiogawa/utils";
import { Session } from "@remix-run/server-runtime";
import { getSessionUser } from "../../utils/auth";
import { getRequestSession, sessionStore } from "../../utils/session.server";
import { ctx_get } from "./storage";

// cookie session

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    session: Session;
    commitSession: () => Promise<void>;
  }
}

export function sessionHandler(): RequestHandler {
  return async (ctx) => {
    ctx.session = await getRequestSession(ctx.request);
    ctx.commitSession = async () => {
      const setCookie = await sessionStore.commitSession(ctx.session);
      ctx.responseHeaders.set("set-cookie", setCookie);
    };
    return ctx.next();
  };
}

export async function ctx_currentUser() {
  return getSessionUser(ctx_get().session);
}

export async function ctx_requireUser() {
  const user = await ctx_currentUser();
  tinyassert(user, "require user");
  return user;
}

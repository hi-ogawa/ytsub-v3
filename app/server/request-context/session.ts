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

    let setCookie: string | undefined;
    ctx.commitSession = async () => {
      setCookie = await sessionStore.commitSession(ctx.session);
    };

    const res = await ctx.next();
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }
    return res;
  };
}

export function ctx_currentUser() {
  return getSessionUser(ctx_get().session);
}

export function ctx_requireUser() {
  const user = ctx_currentUser();
  tinyassert(user, "require user");
  return user;
}

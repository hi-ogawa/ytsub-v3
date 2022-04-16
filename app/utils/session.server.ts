import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { env } from "../misc/env";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [env.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

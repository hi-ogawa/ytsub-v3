import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { env } from "../env";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      secrets: [env.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

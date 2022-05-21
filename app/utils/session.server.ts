import { createCookieSessionStorage } from "@remix-run/node";
import { env } from "../misc/env.server";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [env.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

import { createCookieSessionStorage } from "@remix-run/node";
import { SECRET } from "../misc/env.server";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [SECRET.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

// TODO: how to switch at build time? (resolution?)
// import { createCookieSessionStorage } from "@remix-run/node";
import { createCookieSessionStorage } from "@remix-run/netlify-edge";
import { env } from "../misc/env";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [env.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

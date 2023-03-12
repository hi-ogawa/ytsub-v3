import { createCookieSessionStorage } from "@remix-run/node";
import { initializeConfigServer, serverConfig } from "./config";

// TODO: avoid config dependent side-effect
initializeConfigServer();

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [serverConfig.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

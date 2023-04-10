import { once } from "@hiogawa/utils";
import {
  Session,
  SessionStorage,
  createCookieSessionStorage,
} from "@remix-run/node";
import { serverConfig } from "./config";

export let sessionStore: SessionStorage;

export const initializeSessionStore = once(() => {
  sessionStore = createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      secrets: [serverConfig.APP_SESSION_SECRET],
    },
  });
});

//
// utils
//

export async function getRequestSession(request: Request): Promise<Session> {
  return sessionStore.getSession(request.headers.get("cookie"));
}

export async function getResponseSession(response: Response): Promise<Session> {
  return sessionStore.getSession(response.headers.get("set-cookie"));
}

export async function setResponseSession(
  response: Response,
  session: Session
): Promise<void> {
  response.headers.set("set-cookie", await sessionStore.commitSession(session));
}

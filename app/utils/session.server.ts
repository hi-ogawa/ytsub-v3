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
      secure: true,
      sameSite: "lax",
      maxAge: 14 * 24 * 60 * 60, // two weeks
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

export async function getResponseSession(
  response: Pick<Response, "headers">
): Promise<Session> {
  return sessionStore.getSession(response.headers.get("set-cookie"));
}

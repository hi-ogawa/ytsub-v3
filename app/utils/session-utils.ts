import { Session } from "@remix-run/server-runtime";
import { commitSession, getSession } from "./session.server";

export async function getRequestSession(request: Request): Promise<Session> {
  return await getSession(request.headers.get("cookie"));
}

// used for testing
export async function getResponseSession(response: Response): Promise<Session> {
  return getSession(response.headers.get("set-cookie"));
}

export async function withResponseSession(
  response: Response,
  session: Session
): Promise<Response> {
  response.headers.set("set-cookie", await commitSession(session));
  return response;
}

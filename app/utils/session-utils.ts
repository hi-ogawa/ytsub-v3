import { LoaderFunction, Session } from "@remix-run/server-runtime";
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

type LoaderFunctionWithSession = (
  _: Parameters<LoaderFunction>[0] & { session: Session }
) => ReturnType<LoaderFunction>;

// This cannot be exported as `session.server.ts` since the decorator will be called on client
// TODO: migrate to `makeLoader(Controller, ...)`
export function withRequestSession(
  loader: LoaderFunctionWithSession
): LoaderFunction {
  return async function wrapper(args) {
    const session = await getRequestSession(args.request);
    const result = await loader({ ...args, session });
    if (result instanceof Response) {
      return withResponseSession(result, session);
    }
    return result;
  };
}

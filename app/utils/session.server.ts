import {
  LoaderFunction,
  Session,
  createCookieSessionStorage,
} from "@remix-run/server-runtime";
import env from "../env";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      secrets: [env.APP_SESSION_SECRET],
    },
  });

export { getSession, commitSession, destroySession };

// TODO: experiment with controller-style request handler

export async function getRequestSession(request: Request): Promise<Session> {
  return getSession(request.headers.get("cookie"));
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

export function withRequestSession(
  loader: LoaderFunctionWithSession
): LoaderFunction {
  return async function wrapper(args) {
    const session = await getRequestSession(args.request);
    const result = loader({ ...args, session });
    if (result instanceof Response) {
      return withResponseSession(result, session);
    }
    return result;
  };
}

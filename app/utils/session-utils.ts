import { LoaderFunction, Session } from "@remix-run/server-runtime";
import type { Variant } from "../components/snackbar";
import { commitSession, getSession } from "./session.server";

export async function getRequestSession(request: Request): Promise<Session> {
  return getSession(request.headers.get("cookie"));
}

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

export function pushSession<T>(
  session: Session,
  key: string,
  item: T,
  options: { flash: boolean }
) {
  const pushed = [...(session.data[key] ?? []), item];
  (options.flash ? session.flash : session.set)(key, pushed);
}

export interface FlashMessage {
  content: string;
  variant?: Variant;
  // TODO: add id for testing?
  // dataTest?: string;
}

export function pushFlashMessage(session: Session, flashMessage: FlashMessage) {
  pushSession<FlashMessage>(session, "flashMessages", flashMessage, {
    flash: true,
  });
}

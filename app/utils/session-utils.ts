import { LoaderFunction, Session } from "@remix-run/server-runtime";
import { commitSession, getSession } from "./session.server";

// NOTE:
//  Since loaders are called in parallel, mutating cookie session in one loader is not supposed to work when other loader still keeps `set-cookie`.
//  The trick here allows "flash value" to be accessible to the requests immediately following the response setting such cookie.
const FLASH_PHASE1_KEY = "~~flash~phase1~~"; // set value via phase1 key
const FLASH_PHASE2_KEY = "~~flash~phase2~~"; // get value via phase2 key

export function setFlash(session: Session, key: string, value: any): void {
  session.set(FLASH_PHASE1_KEY + key, value);
}

export function getFlash(
  session: Session,
  key: string,
  phase: "phase1" | "phase2" = "phase2"
): any {
  return session.get(
    (phase === "phase1" ? FLASH_PHASE1_KEY : FLASH_PHASE2_KEY) + key
  );
}

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
  const data = session.data;
  for (const key in data) {
    if (key.startsWith(FLASH_PHASE1_KEY)) {
      const key2 = key.replace(FLASH_PHASE1_KEY, FLASH_PHASE2_KEY);
      session.set(key2, data[key]);
      session.unset(key);
    } else if (key.startsWith(FLASH_PHASE2_KEY)) {
      session.unset(key);
    }
  }
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

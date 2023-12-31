import { RequestContext, composePartial } from "@hattip/compose";
import { TT } from "#db/drizzle-client.server";
import { requestContextHandler } from "#server/request-context";
import { writeCookieSession } from "#server/request-context/session";

// mock async storage for unit tests

export function mockRequestContext(options?: { user?: TT["users"] }) {
  return async <T>(f: () => Promise<T>): Promise<T> => {
    const request = new Request("http://__dummy.local");
    if (options?.user) {
      const cookie = await writeCookieSession({
        user: { id: options.user.id },
      });
      request.headers.set("cookie", cookie);
    }

    // mock only required data for tests
    const mockCtx: Partial<RequestContext> = {
      request,
      url: new URL(request.url),
    };

    // run through actual hattip handlers
    let result!: T;
    await composePartial([
      ...requestContextHandler(),
      async () => {
        result = await f();
        return new Response();
      },
    ])(mockCtx as RequestContext);
    return result;
  };
}

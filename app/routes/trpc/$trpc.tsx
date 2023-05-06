import type { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTrpcAppContext } from "../../trpc/context";
import { trpcApp } from "../../trpc/server";
import { decorateTraceAsync } from "../../utils/opentelemetry-utils";

// catch-all trpc endpoint (cf. https://trpc.io/docs/server/adapters/fetch#remix)

function trpcHandler(args: { request: Request }) {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: args.request,
    router: trpcApp,
    createContext: createTrpcAppContext,
    // quick error logging since otherwise remix only shows 500 access log
    onError: (e) => {
      console.error(e);
    },
  });
}

const trpcHandlerWrapper = decorateTraceAsync(trpcHandler, (args) => {
  const url = new URL(args.request.url);
  const spanName = `${args.request.method} ${url.pathname}`;
  return { spanName };
});

export const loader: LoaderFunction = trpcHandlerWrapper;
export const action: ActionFunction = trpcHandlerWrapper;

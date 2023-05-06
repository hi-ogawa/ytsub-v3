import { SpanKind, SpanOptions } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { traceAsync } from "../utils/opentelemetry-utils";
import { initializeServer } from "./initialize-server";

// cf. patches/@remix-run__server-runtime

// patch remix internal for
// - one-time server initialization
// - tracing

export function injectPatch() {
  Object.assign(globalThis, { __wrapRequestHandler: wrapRequestHandler });
  Object.assign(globalThis, { __wrapLoader: wrapLoader });
}

function wrapRequestHandler(original: (...args: unknown[]) => unknown) {
  return async (...args: unknown[]) => {
    // one-time server initialization
    await initializeServer();

    // trace metadata
    const request = args[0] as Request;
    const url = new URL(request.url);
    const spanName = `request-handler ${request.method}`;
    const spanOptions: SpanOptions = {
      kind: SpanKind.SERVER,
      attributes: {
        [SemanticAttributes.HTTP_METHOD]: request.method,
        [SemanticAttributes.HTTP_SCHEME]: url.protocol.slice(0, -1),
        [SemanticAttributes.HTTP_TARGET]: url.pathname + url.search,
        [SemanticAttributes.NET_HOST_NAME]: url.hostname,
        [SemanticAttributes.NET_HOST_PORT]: url.port,
      },
    };

    return traceAsync(() => original(...args), spanName, spanOptions);
  };
}

function wrapLoader(original: () => unknown, route: { path: string }) {
  // TODO: more filtering? (e.g. service-worker.js, manifest.json)
  if (route.path === "trpc/:trpc") {
    return original;
  }
  return () => traceAsync(original, `loader /${route.path}`);
}

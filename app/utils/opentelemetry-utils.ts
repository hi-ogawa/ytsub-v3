import process from "node:process";
import { once } from "@hiogawa/utils";
import {
  SpanOptions,
  SpanStatusCode,
  context,
  trace,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";

// based on https://github.com/hi-ogawa/youtube-dl-web-v2/blob/cc66c0bcdfd2f669edd0d03016cb5fd45ee1f5fe/packages/app/src/utils/otel-utils.ts

/*

# how to view trace locally

```sh
# see logs on console
OTEL_TRACES_EXPORTER=console pnpm dev

# see logs on local jaeger
docker-compose up jaeger
OTEL_TRACES_EXPORTER=otlp OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json pnpm dev
```

*/

let sdk: NodeSDK;

export const initializeOpentelemetry = once(() => {
  if (!process.env["OTEL_TRACES_EXPORTER"]) return;

  sdk = new NodeSDK();
  sdk.start();
});

export const finalizeOpentelemetry = once(() => {
  if (sdk) {
    sdk.shutdown();
  }
});

function getDefaultTracer() {
  return trace.getTracer("default");
}

// ts-prune-ignore-next
export async function traceAsync<T>(
  asyncFn: () => T,
  spanName: string,
  spanOptions?: SpanOptions
): Promise<T> {
  const tracer = getDefaultTracer();
  const span = tracer.startSpan(spanName, spanOptions);
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      return await asyncFn();
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(e as any);
      throw e;
    } finally {
      span.end();
    }
  });
}

export function decorateTraceAsync<F extends (...args: any[]) => any>(
  asyncFn: F,
  metaFn: (...args: Parameters<F>) => {
    spanName: string;
    spanOptions?: SpanOptions;
  }
): F {
  const wrapper = (...args: Parameters<F>) => {
    const meta = metaFn(...args);
    return traceAsync(() => asyncFn(...args), meta.spanName, meta.spanOptions);
  };
  return wrapper as F;
}

// cf. patches/@remix-run__server-runtime
function traceRemixLoader(original: () => unknown, route: { path: string }) {
  if (route.path === "trpc/:trpc") {
    return original;
  }
  return () => traceAsync(original, `loader /${route.path}`);
}

export function injectTraceRemixLoader() {
  Object.assign(globalThis, { __wrapLoader: traceRemixLoader });
}

import process from "node:process";
import {
  Span,
  SpanOptions,
  SpanStatusCode,
  context,
  trace,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";

// based on https://github.com/hi-ogawa/youtube-dl-web-v2/blob/979f62c0384a9fbf382103fa1f447883669cbf10/packages/app/src/utils/otel-utils.ts

/*
```sh
# see logs on console
OTEL_SERVICE_NAME=dev OTEL_TRACES_EXPORTER=console pnpm dev

# see logs on local jaeger
docker-compose up jaeger
OTEL_SERVICE_NAME=dev OTEL_TRACES_EXPORTER=otlp OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json pnpm dev
```
*/

let sdk: NodeSDK | undefined;

export async function initializeOpentelemetry() {
  if (!process.env["OTEL_TRACES_EXPORTER"]) return;

  sdk = new NodeSDK();
  sdk.start();
}

export async function finalizeOpentelemetry() {
  await sdk?.shutdown();
}

export async function traceAsync<T>(
  meta: {
    name: string;
    options?: SpanOptions;
  },
  asyncFn: (span: Span) => T
): Promise<Awaited<T>> {
  const span = trace.getTracer("default").startSpan(meta.name, meta.options);
  // redundant async/await to workaround typing
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      // span can be also accessed by `trace.getActiveSpan()`
      return await asyncFn(span);
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(e as any);
      throw e;
    } finally {
      span.end();
    }
  });
}

type SpanMetaFn<F extends (...args: any[]) => any> = (
  ...args: Parameters<F>
) => {
  name: string;
  options?: SpanOptions;
};

export function wrapTraceAsync<F extends (...args: any[]) => any>(
  asyncFn: F,
  spanMetaFn: SpanMetaFn<F>
): F {
  function wrapper(this: unknown, ...args: Parameters<F>) {
    return traceAsync(spanMetaFn(...args), () => asyncFn.apply(this, args));
  }
  return wrapper as F;
}

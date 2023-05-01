import type { IncomingMessage, ServerResponse } from "node:http";
import { tinyassert, typedBoolean } from "@hiogawa/utils";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/express";

// borrow "@remix-run/express" adapter for vercel serverless deployment
// since "@remix-run/vercel" is going to deprecate (https://github.com/remix-run/remix/pull/5964)
// in favor of vercel's official integration (https://github.com/vercel/vercel/blob/da046d85de8121e6c851af8e51aff81984646e0b/packages/remix/defaults/server-node.mjs)

const handleRequest = createRequestHandler({ build });

export default async function vercelEntrypoint(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // a few patches to fake express style Request/Response
  // https://github.com/remix-run/remix/blob/71e94aa8a84cd9b63669dc9d826cbcbb0d2195a1/packages/remix-express/server.ts
  // https://github.com/remix-run/remix/blob/71e94aa8a84cd9b63669dc9d826cbcbb0d2195a1/packages/remix-vercel/server.ts

  const req2 = req as any;
  const res2 = res as any;

  req2.get = (arg: unknown) => {
    tinyassert(arg === "host");
    return req.headers["x-forwarded-host"] || req.headers["host"];
  };

  req2.protocol = req.headers["x-forwarded-proto"] || "https";

  res2.status = (arg: unknown) => {
    tinyassert(typeof arg === "number");
    res.statusCode = arg;
  };

  res2.append = (k: unknown, v: unknown) => {
    tinyassert(typeof k === "string");
    tinyassert(typeof v === "string");
    const vs = [res.getHeader(k), v].flat().filter(typedBoolean).map(String);
    res.setHeader(k, vs);
  };

  let error: unknown;
  await handleRequest(req2, res2, (e) => (error = e));
  if (error) {
    throw error;
  }
}

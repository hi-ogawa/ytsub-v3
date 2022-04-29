import * as build from "@remix-run/dev/server-build";
import { createRequestHandler as createRemixRequestHandler } from "@remix-run/server-runtime";

// cf. https://github.com/remix-run/remix/blob/fd9fa7f4b5abaa6a0c8204c66b92033815ba7d0e/packages/remix-netlify-edge/server.ts

// e.g. `context.next`
interface NetlifyEdgeContext {}

async function netlifyEdgeHandler(
  request: Request,
  _context: NetlifyEdgeContext
) {
  const url = new URL(request.url);
  // Hard-code root assets for CDN delegation
  if (
    url.pathname.startsWith("/build") ||
    url.pathname.startsWith("/ui-dev") ||
    url.pathname.startsWith("/_copy") ||
    url.pathname.startsWith("/service-worker.js")
  ) {
    return;
  }
  // {
  //   const res = { url: request.url, pathname: url.pathname };
  //   return new Response(JSON.stringify(res, null, 2));
  // }
  const remixHandler = createRemixRequestHandler(build);
  return await remixHandler(request);
}

export default netlifyEdgeHandler;

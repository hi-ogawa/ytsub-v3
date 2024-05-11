import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { wrapTraceAsyncSimple } from "./utils/opentelemetry-utils";

const handleDocumentRequest: HandleDocumentRequestFunction = async (
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) => {
  // TODO: streaming
  const ssrHtml = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );
  responseHeaders.set("content-type", "text/html");
  return new Response(ssrHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default wrapTraceAsyncSimple(handleDocumentRequest);

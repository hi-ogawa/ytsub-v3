import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { renderToDocument } from "./server/document";
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
  const documentHtml = await renderToDocument(ssrHtml);
  responseHeaders.set("content-type", "text/html");
  return new Response(documentHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default wrapTraceAsyncSimple(handleDocumentRequest);

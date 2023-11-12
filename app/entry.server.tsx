import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { renderToDocument } from "./server/document";
import { wrapTraceAsyncSimple } from "./utils/opentelemetry-utils";
import { tinyassert } from "@hiogawa/utils";
import { viteDevServer } from "@hiogawa/vite-import-dev-server/runtime";

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

  let style: string
  if (import.meta.env.DEV) {
    // inject CSS to quickly workaround FOUC during dev
    // since vite/unocss will inject css on client via javascript later.
    // this would essentially create a duplicate style,
    // but that's not usually a problem for utility-class based styling.
    tinyassert(viteDevServer);
    const unocss = await viteDevServer.ssrLoadModule("virtual:uno.css");
    style = `<style>${unocss["default"]}</style>`;
  } else {
    // since we don't use <Links />, we have to inject unocss output manually.
    const root = remixContext.manifest.routes["root"];
    tinyassert(root && root.css && root.css[0]);
    style = `<link rel="stylesheet" href="${root.css[0]}">`;
  }

  const documentHtml = await renderToDocument(ssrHtml, style);
  responseHeaders.set("content-type", "text/html");
  return new Response(documentHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default wrapTraceAsyncSimple(handleDocumentRequest);

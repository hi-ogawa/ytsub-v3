import { tinyassert } from "@hiogawa/utils";
import { viteDevServer } from "@hiogawa/vite-import-dev-server/runtime";
import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { renderToDocument } from "#server/document";
import { wrapTraceAsyncSimple } from "#utils/opentelemetry-utils";

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

  let styleHrefs: string[] = [];
  if (import.meta.env.DEV) {
    // cf. https://github.com/hi-ogawa/vite-plugins/blob/009cd6d2bc50312ec541753ac8e65a8b8be24b8f/packages/demo/vite-plugin-ssr-css.ts#L18-L25
    tinyassert(viteDevServer);
    const [, resolvedId] = await viteDevServer.moduleGraph.resolveUrl(
      "virtual:uno.css"
    );
    styleHrefs = [`${resolvedId}?direct`];
  } else {
    // since we don't use <Links />, we inject unocss output manually.
    const root = remixContext.manifest.routes["root"];
    styleHrefs = root.css ?? [];
  }

  const style = styleHrefs
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n");
  const documentHtml = await renderToDocument(ssrHtml, style);
  responseHeaders.set("content-type", "text/html");
  return new Response(documentHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default wrapTraceAsyncSimple(handleDocumentRequest);

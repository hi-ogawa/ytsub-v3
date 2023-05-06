import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { injectThemeScript } from "./components/theme-select";
import { injectPatch } from "./misc/patch";
import { injectConfigScript } from "./utils/config";
import { decorateTraceAsync } from "./utils/opentelemetry-utils";

injectPatch();

const handler: HandleDocumentRequestFunction = async (
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) => {
  // TODO: renderToPipeableStream https://github.com/remix-run/remix/blob/72c22b3deb9e84e97359b481f7f2af6cdc355877/packages/remix-dev/config/defaults/entry.server.node.tsx#L10-L11
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );
  markup = injectConfigScript(markup);
  markup = injectThemeScript(markup);
  responseHeaders.set("content-type", "text/html");
  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

const handlerWrapper = decorateTraceAsync(handler, () => {
  return { spanName: "HandleDocumentRequest" };
});

export default handlerWrapper;

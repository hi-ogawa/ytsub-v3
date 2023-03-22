import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import { initializeConfigServer, injectConfigScript } from "./utils/config";

// TODO: avoid side-effect
initializeConfigServer();

const handler: HandleDocumentRequestFunction = (
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
  responseHeaders.set("content-type", "text/html");
  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default handler;

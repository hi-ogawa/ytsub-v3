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

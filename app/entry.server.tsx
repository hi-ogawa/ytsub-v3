import { RemixServer } from "@remix-run/react";
import type { HandleDocumentRequestFunction } from "@remix-run/server-runtime";
import { renderToString } from "react-dom/server";
import {
  CONFIG_SCRIPT_PLACEHOLDER,
  initializeConfigServer,
  publicConfig,
} from "./utils/config";

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

// TODO: do this elsewhere not as as side-effect
initializeConfigServer();

function injectConfigScript(markup: string): string {
  return markup.replace(
    CONFIG_SCRIPT_PLACEHOLDER,
    JSON.stringify(publicConfig)
  );
}

export default handler;

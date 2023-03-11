import { RemixBrowser } from "@remix-run/react";
import * as React from "react";
import { hydrate } from "react-dom";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializeConfigClient } from "./utils/config";

function main() {
  registerServiceWorker();
  initializeConfigClient();
  hydrate(<RemixBrowser />, window.document);
}

main();

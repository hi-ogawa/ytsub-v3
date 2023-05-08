import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializeConfigClient } from "./utils/config";
import { initializeSentryBrowser } from "./utils/sentry-utils.client";

function main() {
  registerServiceWorker();
  initializeConfigClient();
  initializeSentryBrowser();
  hydrateRoot(window.document, <RemixBrowser />);
}

main();

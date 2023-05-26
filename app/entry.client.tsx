import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializePublicConfigClient } from "./utils/config-public";

function main() {
  registerServiceWorker();
  initializePublicConfigClient();
  hydrateRoot(window.document, <RemixBrowser />);
}

main();

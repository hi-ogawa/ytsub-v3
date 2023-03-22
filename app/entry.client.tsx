import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializeConfigClient } from "./utils/config";

function main() {
  registerServiceWorker();
  initializeConfigClient();
  hydrateRoot(window.document, <RemixBrowser />);
}

main();

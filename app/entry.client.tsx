import { RemixBrowser } from "@remix-run/react";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializeConfigClient } from "./utils/config";

function main() {
  registerServiceWorker();
  initializeConfigClient();
  React.startTransition(() => {
    hydrateRoot(
      window.document,
      <React.StrictMode>
        <RemixBrowser />
      </React.StrictMode>
    );
  });
}

main();

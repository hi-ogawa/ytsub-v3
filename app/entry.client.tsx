import "virtual:uno.css";
import { tinyassert } from "@hiogawa/utils";
import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import { registerServiceWorker } from "./misc/register-service-worker.client";
import { initializePublicConfigClient } from "./utils/config-public";

function main() {
  registerServiceWorker();
  initializePublicConfigClient();
  const el = document.getElementById("root");
  tinyassert(el);
  hydrateRoot(el, <RemixBrowser />);
}

main();

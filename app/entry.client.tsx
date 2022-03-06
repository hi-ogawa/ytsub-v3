import { RemixBrowser } from "@remix-run/react";
import * as React from "react";
import { hydrate } from "react-dom";

function main() {
  hydrate(<RemixBrowser />, window.document);
}

main();

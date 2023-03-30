import { installGlobals } from "@remix-run/node";
import { once } from "lodash";
import { initializeConfigServer } from "../utils/config";

export const initializeServer = once(async () => {
  installGlobals();
  initializeConfigServer();
});

// to workaround async initialization on the server (cf. @remix-run/server-runtime patch)
export function injectInitializeServer() {
  Object.assign(globalThis, { __onRequestHandler: initializeServer });
}

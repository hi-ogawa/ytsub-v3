import { installGlobals } from "@remix-run/node";
import { once } from "lodash";
import { initializeDrizzleClient } from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";

export const initializeServer = once(async () => {
  installGlobals();
  initializeConfigServer();
  await initializeDrizzleClient();
});

// to workaround async initialization on the server (cf. @remix-run/server-runtime patch)
export function injectInitializeServer() {
  Object.assign(globalThis, { __onRequestHandler: initializeServer });
}

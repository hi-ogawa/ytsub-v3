import { installGlobals } from "@remix-run/node";
import { once } from "lodash";
import { client } from "../db/client.server";
import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";

export const initializeServer = once(async () => {
  installGlobals();
  initializeConfigServer();
  await initializeDrizzleClient();
});

export async function finalizeServer() {
  await client.destroy();
  await finalizeDrizzleClient();
}

// to workaround async initialization on the server (cf. @remix-run/server-runtime patch)
export function injectInitializeServer() {
  Object.assign(globalThis, { __onRequestHandler: initializeServer });
}

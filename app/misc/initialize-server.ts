import { once } from "@hiogawa/utils";
import { installGlobals } from "@remix-run/node";
import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";
import { initializeSentryServer } from "../utils/sentry-utils.server";
import { initializeSessionStore } from "../utils/session.server";

export const initializeServer = once(async () => {
  installGlobals();
  initializeConfigServer();
  initializeSentryServer();
  initializeSessionStore();
  await initializeDrizzleClient();
});

export async function finalizeServer() {
  await finalizeDrizzleClient();
}

// to workaround async initialization on the server (cf. @remix-run/server-runtime patch)
export function injectInitializeServer() {
  Object.assign(globalThis, { __onRequestHandler: initializeServer });
}

import { once } from "@hiogawa/utils";
import { installGlobals } from "@remix-run/node";
import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";
import {
  finalizeOpentelemetry,
  initializeOpentelemetry,
  injectTraceRemixLoader,
} from "../utils/opentelemetry-utils";
import { initializeSessionStore } from "../utils/session.server";

export const initializeServer = once(async () => {
  injectTraceRemixLoader();
  initializeOpentelemetry();
  installGlobals();
  initializeConfigServer();
  initializeSessionStore();
  await initializeDrizzleClient();
});

export async function finalizeServer() {
  await finalizeDrizzleClient();
  finalizeOpentelemetry();
}

// to workaround async initialization on the server (cf. @remix-run/server-runtime patch)
export function injectInitializeServer() {
  Object.assign(globalThis, { __onRequestHandler: initializeServer });
}

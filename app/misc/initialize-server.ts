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
} from "../utils/opentelemetry-utils";
import { initializeSessionStore } from "../utils/session.server";

export const initializeServer = once(async () => {
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

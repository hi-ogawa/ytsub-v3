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

export async function initializeServer() {
  initializeOpentelemetry();
  initializeConfigServer();
  initializeSessionStore();
  await initializeDrizzleClient();
}

export async function finalizeServer() {
  await finalizeDrizzleClient();
  finalizeOpentelemetry();
}

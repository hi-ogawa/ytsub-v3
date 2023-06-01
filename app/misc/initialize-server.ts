import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";
import { initializeSessionStore } from "../utils/session.server";

export async function initializeServer() {
  initializeConfigServer();
  initializeSessionStore();
  await initializeDrizzleClient();
}

export async function finalizeServer() {
  await finalizeDrizzleClient();
}

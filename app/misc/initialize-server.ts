import { once } from "@hiogawa/utils";
import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "../db/drizzle-client.server";
import { initializeConfigServer } from "../utils/config";
import { initializeSessionStore } from "../utils/session.server";

export const initializeServer = once(async () => {
  initializeConfigServer();
  initializeSessionStore();
  await initializeDrizzleClient();
});

export async function finalizeServer() {
  await finalizeDrizzleClient();
}

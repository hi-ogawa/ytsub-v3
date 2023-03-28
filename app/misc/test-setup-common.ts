import { installGlobals } from "@remix-run/node";
import { initializeDrizzleClient } from "../db/drizzle-client.server";
import { initializeConfigServer, publicConfig } from "../utils/config";

export async function testSetupCommon() {
  installGlobals();
  initializeConfigServer();
  publicConfig.APP_RECAPTCHA_DISABLED = true;
  await initializeDrizzleClient();
}

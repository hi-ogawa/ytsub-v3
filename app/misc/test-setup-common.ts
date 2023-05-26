import { publicConfig } from "../utils/config-public";
import { initializeServer } from "./initialize-server";

export async function testSetupCommon() {
  await initializeServer();
  publicConfig.APP_RECAPTCHA_DISABLED = true;
}

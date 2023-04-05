import { publicConfig } from "../utils/config";
import { initializeServer } from "./initialize-server";

export async function testSetupCommon() {
  await initializeServer();
  publicConfig.APP_RECAPTCHA_DISABLED = true;
}

// import { installGlobals } from "@remix-run/node";
import { beforeAll } from "vitest";
// import { initializeDrizzleClient } from "../db/drizzle-client.server";
// import { initializeConfigServer, publicConfig } from "../utils/config";
import { testSetupCommon } from "./test-setup-common";

beforeAll(async () => {
  await testSetupCommon();
  // installGlobals();
  // initializeConfigServer();
  // publicConfig.APP_RECAPTCHA_DISABLED = true;
  // await initializeDrizzleClient();
});

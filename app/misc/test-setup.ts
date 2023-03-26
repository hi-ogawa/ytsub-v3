import { installGlobals } from "@remix-run/node";
import { beforeAll } from "vitest";
import { initializeDrizzleClient } from "../db/drizzle-client.server";
import { initializeConfigServer, publicConfig } from "../utils/config";

beforeAll(() => {
  installGlobals();
  initializeConfigServer();
  initializeDrizzleClient();
  publicConfig.APP_RECAPTCHA_DISABLED = true;
});

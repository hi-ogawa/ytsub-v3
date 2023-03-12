import { installGlobals } from "@remix-run/node";
import { beforeAll } from "vitest";
import { initializeConfigServer, publicConfig } from "../utils/config";

beforeAll(() => {
  installGlobals();
  initializeConfigServer();
  publicConfig.APP_RECAPTCHA_DISABLED = true;
});

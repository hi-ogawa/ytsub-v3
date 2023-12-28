import "@hiogawa/tiny-jwt/dist/polyfill-node";
import {
  finalizeDrizzleClient,
  initializeDrizzleClient,
} from "#db/drizzle-client.server";
import { initializeConfigServer } from "#utils/config";
import {
  finalizeOpentelemetry,
  initializeOpentelemetry,
} from "#utils/opentelemetry-utils";
import { finalizeArgon2, initializeArgon2 } from "#utils/password-utils";

export async function initializeServer() {
  initializeOpentelemetry();
  initializeConfigServer();
  await initializeArgon2();
  await initializeDrizzleClient();
}

export async function finalizeServer() {
  await finalizeDrizzleClient();
  await finalizeArgon2();
  finalizeOpentelemetry();
}

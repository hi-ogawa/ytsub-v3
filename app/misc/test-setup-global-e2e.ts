import { client } from "../db/client.server";
// import { initializeDrizzleClient } from "../db/drizzle-client.server";
import { truncateAll } from "../db/models";
// import { initializeConfigServer } from "../utils/config";
import { exec } from "../utils/node.server";
import { testSetupCommon } from "./test-setup-common";

// TODO: move to common helper for unit/e2e
export async function restoreDump() {
  const { stdout } = await exec("gunzip -c misc/db/dev.sql.gz");
  await client.raw(stdout);
}

export default async () => {
  // console.log("==", __filename);
  // setup base data for ease of testing (the dump includes "dev" user)
  await truncateAll();
  await restoreDump();
  // await testSetupCommon();
  // initializeConfigServer();
  // console.log("== initializeDrizzleClient:before");
  // await initializeDrizzleClient();
  // console.log("== initializeDrizzleClient:fater");

  // returns teardown callback
  return async () => {
    await client.destroy();
  };
};

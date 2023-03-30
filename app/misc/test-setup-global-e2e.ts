import { client } from "../db/client.server";
import { truncateAll } from "../db/models";
import { exec } from "../utils/node.server";
import { testSetupCommon } from "./test-setup-common";

// TODO: move to common helper for unit/e2e
export async function restoreDump() {
  const { stdout } = await exec("gunzip -c misc/db/dev.sql.gz");
  await client.raw(stdout);
}

export default async () => {
  await truncateAll();
  await restoreDump();
  await testSetupCommon();

  // returns teardown callback
  return async () => {
    await client.destroy();
  };
};

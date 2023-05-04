import { finalizeDrizzleClient } from "../db/drizzle-client.server";
import { truncateAll } from "../db/models";
import { testSetupCommon } from "./test-setup-common";

export default async () => {
  await testSetupCommon();
  await truncateAll();

  // returns teardown callback
  return async () => {
    await finalizeDrizzleClient();
  };
};

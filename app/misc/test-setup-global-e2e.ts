import { client } from "../db/client.server";
import { truncateAll } from "../db/models";
import { testSetupCommon } from "./test-setup-common";

export default async () => {
  await truncateAll();
  await testSetupCommon();

  // returns teardown callback
  return async () => {
    await client.destroy();
  };
};

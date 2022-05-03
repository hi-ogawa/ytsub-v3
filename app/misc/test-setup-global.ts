import { client } from "../db/client.server";
import { truncateAll } from "../db/models";

export default async () => {
  await truncateAll();

  // returns teardown callback
  return async () => {
    await client.destroy();
  };
};

import { client } from "../db/client.server";
import { deleteOrphans } from "../db/models";

export default async () => {
  // cleanup at `setup` since it's more reliable than `teardown`
  await deleteOrphans();

  // returns teardown
  return async () => {
    await client.destroy();
  };
};

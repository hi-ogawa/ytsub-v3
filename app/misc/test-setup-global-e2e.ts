import { client } from "../db/client.server";
import { truncateAll } from "../db/models";
import { exec } from "../utils/node.server";

export async function restoreDump() {
  const { stdout } = await exec(
    "gunzip -c misc/db/dump/2022_05_07_11_38_00.sql.gz"
  );
  await client.raw(stdout);
}

export default async () => {
  // setup base data for ease of testing (the dump includes "dev" user)
  await truncateAll();
  await restoreDump();

  // returns teardown callback
  return async () => {
    await client.destroy();
  };
};

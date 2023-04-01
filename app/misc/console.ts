import { client } from "../db/client.server";
import { E, T, db } from "../db/drizzle-client.server";
import { Q } from "../db/models";
import { initializeServer } from "./initialize-server";

/*

usage:

$ pnpm console
> await db.select().from(T.users)

*/

async function main() {
  await initializeServer();
  Object.assign(globalThis, {
    client,
    Q,
    T,
    E,
    db,
  });
}

main();

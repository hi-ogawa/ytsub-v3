import { sql } from "drizzle-orm";
import { client } from "../db/client.server";
import { E, T, db } from "../db/drizzle-client.server";
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
    T,
    E,
    db,
    sql,
  });
}

main();

import { sql } from "drizzle-orm";
import { E, T, db, dbRaw } from "#db/drizzle-client.server";
import { initializeServer } from "#misc/initialize-server";

/*

usage:

$ pnpm console
> await db.select().from(T.users)

*/

async function main() {
  await initializeServer();
  Object.assign(globalThis, {
    T,
    E,
    db,
    dbRaw,
    sql,
  });
}

main();

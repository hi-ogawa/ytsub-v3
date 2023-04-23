import type { LoaderFunction } from "@remix-run/server-runtime";
import { T, db } from "../../db/drizzle-client.server";

export const loader: LoaderFunction = async () => {
  const knex_migrations = await db.select().from(T.knex_migrations);
  const res = { knex_migrations };
  return new Response(JSON.stringify(res, null, 2), {
    headers: { "content-type": "application/json" },
  });
};

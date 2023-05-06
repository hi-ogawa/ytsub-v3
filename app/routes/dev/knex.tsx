import type { LoaderFunction } from "@remix-run/server-runtime";
import { T, db } from "../../db/drizzle-client.server";
import { prettierJson } from "../../utils/loader-utils";

export const loader: LoaderFunction = async () => {
  const knex_migrations = await db.select().from(T.knex_migrations);
  const res = { knex_migrations };
  return prettierJson(res);
};

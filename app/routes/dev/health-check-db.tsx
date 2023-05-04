import type { LoaderFunction } from "@remix-run/server-runtime";
import { T, db, toCountSql } from "../../db/drizzle-client.server";

export const loader: LoaderFunction = async () => {
  // TODO: delete/insert to wake up sleeping planetscale db https://planetscale.com/docs/concepts/database-sleeping
  const videosCount = await toCountSql(db.select().from(T.videos));
  return { success: true, videosCount };
};

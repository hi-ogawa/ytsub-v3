import { LoaderFunction } from "@remix-run/server-runtime";
import { Q, toCount } from "../db/models";

export const loader: LoaderFunction = async () => {
  // TODO: delete/insert to wake up sleeping planetscale db https://planetscale.com/docs/concepts/database-sleeping
  const videosCount = await toCount(Q.videos());
  return { success: true, videosCount };
};

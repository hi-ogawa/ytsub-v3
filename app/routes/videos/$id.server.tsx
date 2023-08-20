import { tinyassert } from "@hiogawa/utils";
import { E, T, selectOne } from "../../db/drizzle-client.server";
import type { VideoTable } from "../../db/models";
import { ROUTE_DEF } from "../../misc/routes";
import { makeLoader } from "../../utils/loader-utils.server";

export type LoaderData = {
  video: VideoTable;
};

export const loader = makeLoader(async ({ ctx }) => {
  const params = ROUTE_DEF["/videos/$id"].params.parse(ctx.params);
  const video = await selectOne(T.videos, E.eq(T.videos.id, params.id));
  tinyassert(video);
  const loaderData: LoaderData = { video };
  return loaderData;
});

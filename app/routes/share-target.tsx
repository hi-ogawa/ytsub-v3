import { tinyassert } from "@hiogawa/utils";
import { $R, ROUTE_DEF } from "../misc/routes";
import { makeLoaderV2 } from "../utils/loader-utils";
import { parseVideoId } from "../utils/youtube";

export const loader = makeLoaderV2(async ({ ctx }) => {
  const query = ROUTE_DEF["/share-target"].query.parse(ctx.query);
  const videoId = parseVideoId(query["share-target-text"]);
  tinyassert(videoId);
  return ctx.redirect($R["/videos/new"](null, { videoId }));
});

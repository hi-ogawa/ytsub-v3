import { tinyassert } from "@hiogawa/utils";
import { redirect } from "@remix-run/server-runtime";
import { $R, ROUTE_DEF } from "../misc/routes";
import { makeLoader } from "../utils/loader-utils";
import { parseVideoId } from "../utils/youtube";

export const loader = makeLoader(async ({ ctx }) => {
  const query = ROUTE_DEF["/share-target"].query.parse(ctx.query);
  const videoId = parseVideoId(query["share-target-text"]);
  tinyassert(videoId);
  return redirect($R["/videos/new"](null, { videoId }));
});

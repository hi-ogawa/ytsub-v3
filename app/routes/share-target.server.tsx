import { tinyassert } from "@hiogawa/utils";
import { redirect } from "@remix-run/server-runtime";
import { $R, ROUTE_DEF } from "../misc/routes";
import { ctx_get } from "../server/request-context/storage";
import { wrapLoader } from "../utils/loader-utils.server";
import { parseVideoId } from "../utils/youtube";

export const loader = wrapLoader(async () => {
  const query = ROUTE_DEF["/share-target"].query.parse(ctx_get().urlQuery);
  const videoId = parseVideoId(query["share-target-text"]);
  tinyassert(videoId);
  return redirect($R["/videos/new"](null, { videoId }));
});

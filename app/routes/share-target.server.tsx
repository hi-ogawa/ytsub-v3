import { redirect } from "@remix-run/server-runtime";
import { $R, ROUTE_DEF } from "#misc/routes";
import { ctx_get } from "#server/request-context/storage";
import {
  assertOrRespond,
  unwrapZodResultOrRespond,
  wrapLoader,
} from "#utils/loader-utils.server";
import { parseVideoId } from "#utils/youtube";

export const loader = wrapLoader(async () => {
  const query = unwrapZodResultOrRespond(
    ROUTE_DEF["/share-target"].query.safeParse(ctx_get().urlQuery)
  );
  const videoId = parseVideoId(query["share-target-text"]);
  assertOrRespond(videoId);
  return redirect($R["/videos/new"](null, { videoId }));
});

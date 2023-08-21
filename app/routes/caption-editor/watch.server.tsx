import { ROUTE_DEF } from "../../misc/routes";
import { ctx_get } from "../../server/request-context/storage";
import {
  assertOrRespond,
  unwrapZodResultOrRespond,
  wrapLoader,
} from "../../utils/loader-utils.server";
import { VideoMetadata } from "../../utils/types";
import { fetchVideoMetadata, parseVideoId } from "../../utils/youtube";

export type LoaderData = {
  videoId: string;
  videoMetadata: VideoMetadata;
};

export const loader = wrapLoader(async () => {
  const query = unwrapZodResultOrRespond(
    ROUTE_DEF["/caption-editor/watch"].query.safeParse(ctx_get().urlQuery)
  );
  const videoId = parseVideoId(query.v);
  assertOrRespond(videoId);
  const videoMetadata = await fetchVideoMetadata(videoId);
  return { videoId, videoMetadata } satisfies LoaderData;
});

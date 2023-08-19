import { tinyassert } from "@hiogawa/utils";
import { ROUTE_DEF } from "../../misc/routes";
import { makeLoader } from "../../utils/loader-utils.server";
import { VideoMetadata } from "../../utils/types";
import { fetchVideoMetadata, parseVideoId } from "../../utils/youtube";

export type LoaderData = {
  videoId: string;
  videoMetadata: VideoMetadata;
};

export const loader = makeLoader(async ({ ctx }) => {
  const query = ROUTE_DEF["/caption-editor/watch"].query.parse(ctx.query);
  const videoId = parseVideoId(query.v);
  tinyassert(videoId);
  const videoMetadata = await fetchVideoMetadata(videoId);
  return { videoId, videoMetadata } satisfies LoaderData;
});

import { redirect } from "@remix-run/server-runtime";
import { $R, ROUTE_DEF } from "../../misc/routes";
import { ctx_get } from "../../server/request-context/storage";
import { ctx_setFlashMessage } from "../../utils/flash-message.server";
import { wrapLoader } from "../../utils/loader-utils.server";
import { VideoMetadata } from "../../utils/types";
import { fetchVideoMetadata } from "../../utils/youtube";

export type LoaderData = {
  videoId: string;
  videoMetadata: VideoMetadata;
};

export const loader = wrapLoader(async () => {
  const query = ROUTE_DEF["/caption-editor/watch"].query.safeParse(
    ctx_get().urlQuery
  );
  if (!query.success) {
    ctx_setFlashMessage({
      content: `Invalid Video ID`,
      variant: "error",
    });
    throw redirect($R["/caption-editor"]());
  }
  const videoId = query.data.v;
  const videoMetadata = await fetchVideoMetadata(videoId); // handle error
  return { videoId, videoMetadata } satisfies LoaderData;
});

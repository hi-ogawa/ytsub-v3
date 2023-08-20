import { tinyassert, wrapErrorAsync } from "@hiogawa/utils";
import { redirect } from "@remix-run/server-runtime";
import type { UserTable } from "../../db/models";
import { R, ROUTE_DEF } from "../../misc/routes";
import { encodeFlashMessage } from "../../utils/flash-message";
import { isLanguageCode } from "../../utils/language";
import { makeLoader } from "../../utils/loader-utils.server";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
  fetchVideoMetadata,
  findCaptionConfigPair,
  parseVideoId,
} from "../../utils/youtube";

export type LoaderData = {
  videoMetadata: VideoMetadata;
  userCaptionConfigs?: { language1?: CaptionConfig; language2?: CaptionConfig };
};

export const loader = makeLoader(async ({ ctx }) => {
  const query = ROUTE_DEF["/videos/new"].query.parse(ctx.query);
  const videoId = parseVideoId(query.videoId);
  tinyassert(videoId);
  const user = await ctx.currentUser();
  const result = await wrapErrorAsync(() => fetchVideoMetadata(videoId));
  if (!result.ok) {
    // either invalid videoId or youtube api failure
    return redirect(
      R["/"] +
        "?" +
        encodeFlashMessage({
          content: `Failed to load a video`,
          variant: "error",
        })
    );
  }
  const videoMetadata = result.value;
  const loaderData: LoaderData = {
    videoMetadata,
    userCaptionConfigs: user && findUserCaptionConfigs(videoMetadata, user),
  };
  return loaderData;
});

function findUserCaptionConfigs(videoMetadata: VideoMetadata, user: UserTable) {
  if (
    user.language1 &&
    user.language2 &&
    isLanguageCode(user.language1) &&
    isLanguageCode(user.language2)
  ) {
    return findCaptionConfigPair(videoMetadata, {
      code1: user.language1,
      code2: user.language2,
    });
  }
  return;
}

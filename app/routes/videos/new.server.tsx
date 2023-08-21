import { wrapErrorAsync } from "@hiogawa/utils";
import { redirect } from "@remix-run/server-runtime";
import type { UserTable } from "../../db/models";
import { R, ROUTE_DEF } from "../../misc/routes";
import { ctx_currentUser } from "../../server/request-context/session";
import { ctx_get } from "../../server/request-context/storage";
import { encodeFlashMessage } from "../../utils/flash-message";
import { isLanguageCode } from "../../utils/language";
import {
  assertOrRespond,
  unwrapZodResultOrRespond,
  wrapLoader,
} from "../../utils/loader-utils.server";
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

export const loader = wrapLoader(async () => {
  const query = unwrapZodResultOrRespond(
    ROUTE_DEF["/videos/new"].query.safeParse(ctx_get().urlQuery)
  );
  const videoId = parseVideoId(query.videoId);
  assertOrRespond(videoId);
  const user = await ctx_currentUser();
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

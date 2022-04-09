import { redirect } from "@remix-run/server-runtime";
import { tables } from "../db/models";
import { Controller, makeLoader } from "../utils/controller-utils";
import { AppError } from "../utils/errors";
import { CaptionEntry, VideoMetadata } from "../utils/types";
import {
  NEW_VIDEO_SCHEMA,
  NewVideo,
  fetchCaptionEntries,
} from "../utils/youtube";

async function insertVideoAndCaptionEntries(
  userId: number,
  newVideo: NewVideo,
  data: {
    videoMetadata: VideoMetadata;
    captionEntries: CaptionEntry[];
  }
): Promise<number> {
  const { language1, language2 } = newVideo;
  const {
    videoMetadata: { videoDetails },
    captionEntries,
  } = data;

  const videoRow = {
    videoId: videoDetails.videoId,
    title: videoDetails.title,
    author: videoDetails.author,
    channelId: videoDetails.channelId,
    language1_id: language1.id,
    language1_translation: language1.translation,
    language2_id: language2.id,
    language2_translation: language2.translation,
    userId,
  };
  const [videoId] = await tables.videos().insert(videoRow);

  const captionEntryRows = captionEntries.map((entry) => ({
    ...entry,
    videoId,
  }));
  await tables.captionEntries().insert(captionEntryRows);

  return videoId;
}

export const action = makeLoader(Controller, async function () {
  // TODO: anonymous user?
  const user = await this.currentUser();
  if (!user) throw new AppError("user not found");

  const parsed = NEW_VIDEO_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const data = await fetchCaptionEntries(parsed.data);
  const id = await insertVideoAndCaptionEntries(user.id, parsed.data, data);
  return redirect(`/videos/${id}`);
});

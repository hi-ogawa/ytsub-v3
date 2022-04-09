import { redirect } from "@remix-run/server-runtime";
import { tables } from "../../db/models";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { PageHandle } from "../../utils/page-handle";
import { CaptionEntry, VideoMetadata } from "../../utils/types";
import {
  NEW_VIDEO_SCHEMA,
  NewVideo,
  fetchCaptionEntries,
} from "../../utils/youtube";

export const handle: PageHandle = {
  navBarTitle: "New Video",
};

async function insertVideoAndCaptionEntries(
  newVideo: NewVideo,
  data: {
    videoMetadata: VideoMetadata;
    captionEntries: CaptionEntry[];
  },
  userId?: number
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

async function findNewVideo(
  { videoId, language1, language2 }: NewVideo,
  userId?: number
): Promise<number | undefined> {
  const row = await tables
    .videos()
    .select("id")
    .where("videoId", videoId)
    .where("language1_id", language1.id)
    .where("language1_translation", language1.translation ?? null)
    .where("language2_id", language2.id)
    .where("language2_translation", language2.translation ?? null)
    .where("userId", userId ?? null)
    .first();
  return row?.id;
}

export const action = makeLoader(Controller, async function () {
  const parsed = NEW_VIDEO_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  let id = await findNewVideo(parsed.data, user?.id);
  if (!id) {
    const data = await fetchCaptionEntries(parsed.data);
    id = await insertVideoAndCaptionEntries(parsed.data, data, user?.id);
  }
  return redirect(`/videos/${id}`);
});

// TODO: migrate components from `setup.tsx`

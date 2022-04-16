import { CaptionEntry, VideoMetadata } from "../utils/types";
import { NewVideo } from "../utils/youtube";
import { client } from "./client.server";
import { C, T } from "./schema";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string; // TODO: hide this field from the client
  createdAt: Date;
  updatedAt: Date;
  language1?: string | null;
  language2?: string | null;
}

// TODO: manage "view count" and "last watched timestamp" etc...
export interface VideoTable {
  id: number;
  videoId: string; // video's id on youtube
  language1_id: string;
  language1_translation?: string | null;
  language2_id: string;
  language2_translation?: string | null;
  title: string;
  author: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: number | null; // associated to anonymous users when `null`
}

export interface CaptionEntryTable {
  id: number;
  index: number; // zero-based index within video's caption entries
  begin: number;
  end: number;
  text1: string;
  text2: string;
  createdAt: Date;
  updatedAt: Date;
  videoId: number; // not `VideoTable.videoId` but `VideoTable.id`
}

export interface BookmarkEntryTable {
  id: number;
  text: string;
  offset: number;
  side: number; // 0 | 1
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  videoId: number;
  captionEntryId: number;
}

export const tables = {
  users: () => client<UserTable>(T.users),
  videos: () => client<VideoTable>(T.videos),
  captionEntries: () => client<CaptionEntryTable>(T.captionEntries),
  bookmarkEntries: () => client<BookmarkEntryTable>(T.bookmarkEntries),
};

//
// Helper queries
//

// no "FOREIGN KEY" constraint principle https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
export async function deleteOrphans(): Promise<void> {
  await tables
    .videos()
    .delete()
    .leftJoin(T.users, C.users.id, C.videos.userId)
    .where(C.users.id, null)
    .whereNot(C.videos.id, null);
  await tables
    .captionEntries()
    .delete()
    .leftJoin(T.videos, C.videos.id, C.captionEntries.videoId)
    .where(C.videos.id, null);
  await tables
    .bookmarkEntries()
    .delete()
    .leftJoin(
      T.captionEntries,
      C.captionEntries.id,
      C.bookmarkEntries.captionEntryId
    )
    .where(C.captionEntries.id, null);
}

export function filterNewVideo(
  { videoId, language1, language2 }: NewVideo,
  userId?: number
) {
  return tables.videos().where({
    videoId,
    language1_id: language1.id,
    language1_translation: language1.translation ?? null,
    language2_id: language2.id,
    language2_translation: language2.translation ?? null,
    userId: userId ?? null,
  });
}

export async function insertVideoAndCaptionEntries(
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

export async function getVideoAndCaptionEntries(
  id: number
): Promise<
  { video: VideoTable; captionEntries: CaptionEntryTable[] } | undefined
> {
  const video = await tables.videos().select("*").where("id", id).first();
  if (video) {
    const captionEntries = await tables
      .captionEntries()
      .select("*")
      .where(C.captionEntries.videoId, id);
    return { video, captionEntries };
  }
  return;
}

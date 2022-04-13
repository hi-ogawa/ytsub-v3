import { CaptionEntry, VideoMetadata } from "../utils/types";
import { NewVideo } from "../utils/youtube";
import { client } from "./client.server";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string; // TODO: hide this field from the client
  createdAt: Date;
  updatedAt: Date;
  language1?: string; // TODO: database returns `null`
  language2?: string;
}

// TODO: manage "view count" and "last watched timestamp" etc...
export interface VideoTable {
  id: number;
  videoId: string; // video's id on youtube
  language1_id: string;
  language1_translation?: string;
  language2_id: string;
  language2_translation?: string;
  title: string;
  author: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: number; // associated to anonymous users when `null`
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
  // TODO: include more information to highlight within caption entry text
  // offset: number;
  // side: 1 | 2;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  videoId: number;
  captionEntryId: number;
}

// TODO: use constants to facilitate static analysis
// export const T = {
//   users: "users",
//   videos: "videos",
//   captionEntries: "captionEntries",
// }

export const tables = {
  users: () => client<UserTable>("users"),
  videos: () => client<VideoTable>("videos"),
  captionEntries: () => client<CaptionEntryTable>("captionEntries"),
  bookmarkEntries: () => client<BookmarkEntryTable>("bookmarkEntries"),
};

//
// Helper queries
//

// no "FOREIGN KEY" constraint principle https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
export async function deleteOrphans(): Promise<void> {
  await tables
    .videos()
    .delete()
    .leftJoin("users", "users.id", "videos.userId")
    .where("users.id", null)
    .whereNot("videos.id", null);
  await tables
    .captionEntries()
    .delete()
    .leftJoin("videos", "videos.id", "captionEntries.videoId")
    .where("videos.id", null);
  await tables
    .bookmarkEntries()
    .delete()
    .leftJoin(
      "captionEntries",
      "captionEntries.id",
      "bookmarkEntries.captionEntryId"
    )
    .where("captionEntries.id", null);
}

export function filterNewVideo(
  { videoId, language1, language2 }: NewVideo,
  userId?: number
) {
  return tables
    .videos()
    .where("videoId", videoId)
    .where("language1_id", language1.id)
    .where("language1_translation", language1.translation ?? null)
    .where("language2_id", language2.id)
    .where("language2_translation", language2.translation ?? null)
    .where("userId", userId ?? null);
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
      .where("videoId", id);
    return { video, captionEntries };
  }
  return;
}

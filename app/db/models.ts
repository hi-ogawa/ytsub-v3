import { Knex } from "knex";
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
  side: number; // 0 | 1
  offset: number;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  videoId: number;
  captionEntryId: number;
}

//
// Cf. Anki's practice system
// - https://docs.ankiweb.net/studying.html
// - https://docs.ankiweb.net/deck-options.html
//

export const PRACTICE_ACTION_TYPES = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export const PRACTICE_QUEUE_TYPES = ["NEW", "LEARN", "REVIEW"] as const;
export type PracticeActionType = typeof PRACTICE_ACTION_TYPES[number];
export type PracticeQueueType = typeof PRACTICE_QUEUE_TYPES[number];

// TODO: deck options
export interface DeckTable {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

export interface PracticeEntryTable {
  id: number;
  queueType: PracticeQueueType;
  easeFactor: number;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deckId: number;
  bookmarkEntryId: number;
}

export interface PracticeActionTable {
  id: number;
  queueType: PracticeQueueType;
  actionType: PracticeActionType;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  deckId: number;
  practiceEntryId: number;
}

export const Q = {
  users: () => client<UserTable>("users"),
  videos: () => client<VideoTable>("videos"),
  captionEntries: () => client<CaptionEntryTable>("captionEntries"),
  bookmarkEntries: () => client<BookmarkEntryTable>("bookmarkEntries"),
  decks: () => client<DeckTable>("decks"),
  practiceEntries: () => client<PracticeEntryTable>("practiceEntries"),
  practiceActions: () => client<PracticeActionTable>("practiceActions"),
};

//
// Helper queries
//

// no "FOREIGN KEY" constraint principle https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
export async function deleteOrphans(): Promise<void> {
  await Q.videos()
    .delete()
    .leftJoin("users", "users.id", "videos.userId")
    .where("users.id", null)
    .whereNot("videos.id", null);
  await Q.captionEntries()
    .delete()
    .leftJoin("videos", "videos.id", "captionEntries.videoId")
    .where("videos.id", null);
  await Q.bookmarkEntries()
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
  return Q.videos()
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
  const [videoId] = await Q.videos().insert(videoRow);

  const captionEntryRows = captionEntries.map((entry) => ({
    ...entry,
    videoId,
  }));
  await Q.captionEntries().insert(captionEntryRows);

  return videoId;
}

export async function getVideoAndCaptionEntries(
  id: number
): Promise<
  { video: VideoTable; captionEntries: CaptionEntryTable[] } | undefined
> {
  const video = await Q.videos().where("id", id).first();
  if (video) {
    const captionEntries = await Q.captionEntries().where("videoId", id);
    return { video, captionEntries };
  }
  return;
}

export interface PaginationMetadata {
  total: number;
  totalPage: number;
  page: number;
  perPage: number;
}

export interface PaginationResult<T> extends PaginationMetadata {
  data: T[];
}

// desperate typing hacks...
export async function toPaginationResult<QB extends Knex.QueryBuilder>(
  query: QB,
  { page, perPage }: { page: number; perPage: number }
): Promise<PaginationResult<QB extends Promise<(infer T)[]> ? T : never>> {
  const queryData = query
    .clone()
    .offset((page - 1) * perPage)
    .limit(perPage);
  // https://github.com/knex/knex/blob/939d8a219c432a7d7dcb1ed1a79d1e5a4686eafd/lib/query/querybuilder.js#L1210
  const queryTotal = query
    .clone()
    .clear("select")
    .clear("order")
    .clear("join") // TODO: this goes wrong when joined columns are used in `where` clause
    .clear("group");
  const [data, total] = await Promise.all([queryData, toCount(queryTotal)]);
  return { data, total, page, perPage, totalPage: Math.ceil(total / perPage) };
}

export async function toCount(query: Knex.QueryBuilder): Promise<number> {
  const { total } = await query.count({ total: 0 }).first();
  return total;
}

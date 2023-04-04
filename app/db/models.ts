import type { Knex } from "knex";
import { z } from "zod";
import type { CaptionEntry, VideoMetadata } from "../utils/types";
import type { NewVideo } from "../utils/youtube";
import { client } from "./client.server";
import type { TT } from "./drizzle-client.server";

// TODO: move everything to drizzle-client?
export type UserTable = TT["users"];
export type VideoTable = TT["videos"];
export type CaptionEntryTable = TT["captionEntries"];
export type BookmarkEntryTable = TT["bookmarkEntries"];
export type DeckTable = TT["decks"];
export type PracticeEntryTable = TT["practiceEntries"];
export type PracticeActionTable = TT["practiceActions"];

// cf. Anki's practice system
// - https://docs.ankiweb.net/studying.html
// - https://docs.ankiweb.net/deck-options.html
const Z_PRACTICE_ACTION_TYPES = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);
const Z_PRACTICE_QUEUE_TYPES = z.enum(["NEW", "LEARN", "REVIEW"]);
export const PRACTICE_ACTION_TYPES = Z_PRACTICE_ACTION_TYPES.options;
export const PRACTICE_QUEUE_TYPES = Z_PRACTICE_QUEUE_TYPES.options;
export type PracticeActionType = z.infer<typeof Z_PRACTICE_ACTION_TYPES>;
export type PracticeQueueType = z.infer<typeof Z_PRACTICE_QUEUE_TYPES>;

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

export async function truncateAll(): Promise<void> {
  await Promise.all(Object.values(Q).map((table) => table().truncate()));
}

// no "FOREIGN KEY" constraint principle https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
export async function deleteOrphans(): Promise<void> {
  await Q.videos()
    .delete()
    .leftJoin("users", "users.id", "videos.userId")
    .where("users.id", null)
    .whereNot("videos.userId", null) // not delete "anonymous" videos
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
  await Q.decks()
    .delete()
    .leftJoin("users", "users.id", "decks.userId")
    .where("users.id", null)
    .whereNot("decks.id", null);
  await Q.practiceEntries()
    .delete()
    .leftJoin("decks", "decks.id", "practiceEntries.deckId")
    .where("decks.id", null)
    .whereNot("practiceEntries.id", null);
  await Q.practiceActions()
    .delete()
    .leftJoin("users", "users.id", "practiceActions.userId")
    .where("users.id", null)
    .whereNot("practiceActions.id", null);
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
  { page, perPage }: { page: number; perPage: number },
  { clearJoin = false }: { clearJoin?: boolean } = {}
): Promise<PaginationResult<QB extends Promise<(infer T)[]> ? T : never>> {
  const queryData = query
    .clone()
    .offset((page - 1) * perPage)
    .limit(perPage);
  // https://github.com/knex/knex/blob/939d8a219c432a7d7dcb1ed1a79d1e5a4686eafd/lib/query/querybuilder.js#L1210
  let queryTotal = query.clone().clear("select").clear("order");
  if (clearJoin) {
    // this will break when `where` depends on joined columns
    queryTotal = queryTotal.clear("join").clear("group");
  }
  const [data, total] = await Promise.all([queryData, toCount(queryTotal)]);
  return { data, total, page, perPage, totalPage: Math.ceil(total / perPage) };
}

export async function toCount(query: Knex.QueryBuilder): Promise<number> {
  const { total } = await query.count({ total: 0 }).first();
  return total;
}

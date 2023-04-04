import { z } from "zod";
import type { CaptionEntry, VideoMetadata } from "../utils/types";
import type { NewVideo } from "../utils/youtube";
import { client } from "./client.server";
import { E, T, TT, db, findOne } from "./drizzle-client.server";

// TODO: organize code (move everything to drizzle-client?)

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
  for (const table of Object.values(T)) {
    await db.delete(table);
  }
}

// no "FOREIGN KEY" constraint https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
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
  return db
    .select()
    .from(T.videos)
    .where(
      E.and(
        E.eq(T.videos.videoId, videoId),
        E.eq(T.videos.language1_id, language1.id),
        E.eq(T.videos.language2_id, language2.id),
        language1.translation
          ? E.eq(T.videos.language1_translation, language1.translation)
          : E.isNull(T.videos.language1_translation),
        language2.translation
          ? E.eq(T.videos.language2_translation, language2.translation)
          : E.isNull(T.videos.language2_translation),
        userId ? E.eq(T.videos.userId, userId) : E.isNull(T.videos.userId)
      )
    );
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

  const [{ insertId: videoId }] = await db.insert(T.videos).values({
    videoId: videoDetails.videoId,
    title: videoDetails.title,
    author: videoDetails.author,
    channelId: videoDetails.channelId,
    language1_id: language1.id,
    language1_translation: language1.translation ?? null,
    language2_id: language2.id,
    language2_translation: language2.translation ?? null,
    userId: userId ?? null,
  });

  await Q.captionEntries().insert(
    captionEntries.map((entry) => ({
      ...entry,
      videoId,
    }))
  );

  return videoId;
}

export async function getVideoAndCaptionEntries(
  id: number
): Promise<
  { video: VideoTable; captionEntries: CaptionEntryTable[] } | undefined
> {
  const video = await findOne(
    db.select().from(T.videos).where(E.eq(T.videos.id, id))
  );
  if (video) {
    const captionEntries = await db
      .select()
      .from(T.captionEntries)
      .where(E.eq(T.captionEntries.videoId, id));
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

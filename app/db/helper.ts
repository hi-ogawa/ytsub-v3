import {
  E,
  T,
  TT,
  db,
  selectOne,
  toDeleteSql,
} from "#db/drizzle-client.server";
import type { CaptionEntry, VideoMetadata } from "#utils/types";
import type { NewVideo } from "#utils/youtube";

export async function truncateAll(): Promise<void> {
  for (const table of Object.values(T)) {
    await db.delete(table);
  }
}

// manually cleanup "orphans" since we don't use automatic deletion with "FOREIGN KEY" constraint
// https://docs.planetscale.com/learn/operating-without-foreign-key-constraints#cleaning-up-orphaned-rows
export async function deleteOrphans(): Promise<void> {
  // users -> videos
  await toDeleteSql(
    db
      .select()
      .from(T.videos)
      .leftJoin(T.users, E.eq(T.users.id, T.videos.userId))
      .where(
        E.and(
          E.isNull(T.users.id as any),
          E.isNotNull(T.videos.userId as any) // keep "anonymous" videos
        )
      )
  );

  // videos -> captionEntries
  await toDeleteSql(
    db
      .select()
      .from(T.captionEntries)
      .leftJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
      .where(E.isNull(T.videos.id as any))
  );

  // captionEntries -> bookmarkEntries
  await toDeleteSql(
    db
      .select()
      .from(T.bookmarkEntries)
      .leftJoin(
        T.captionEntries,
        E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
      )
      .where(E.isNull(T.captionEntries.id as any))
  );

  // users -> decks
  await toDeleteSql(
    db
      .select()
      .from(T.decks)
      .leftJoin(T.users, E.eq(T.users.id, T.decks.userId))
      .where(E.isNull(T.users.id as any))
  );

  // decks -> practiceEntries
  await toDeleteSql(
    db
      .select()
      .from(T.practiceEntries)
      .leftJoin(T.decks, E.eq(T.decks.id, T.practiceEntries.deckId))
      .where(E.isNull(T.decks.id as any))
  );

  // practiceEntries -> practiceActions
  await toDeleteSql(
    db
      .select()
      .from(T.practiceActions)
      .leftJoin(
        T.practiceEntries,
        E.eq(T.practiceEntries.id, T.practiceActions.practiceEntryId)
      )
      .where(E.isNull(T.practiceEntries.id as any))
  );
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

  await db.insert(T.captionEntries).values(
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
  { video: TT["videos"]; captionEntries: TT["captionEntries"][] } | undefined
> {
  const video = await selectOne(T.videos, E.eq(T.videos.id, id));
  if (video) {
    const captionEntries = await db
      .select()
      .from(T.captionEntries)
      .where(E.eq(T.captionEntries.videoId, id));
    return { video, captionEntries };
  }
  return;
}

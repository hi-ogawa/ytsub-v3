import { UncheckedMap, objectOmit, tinyassert, uniq } from "@hiogawa/utils";
import { E, T, db, findOne } from "../db/drizzle-client.server";

//
// export/import all data associated to single deck
//

type ExportDeckData = Awaited<ReturnType<typeof exportDeck>>;

export async function exportDeck(id: number) {
  const deck = await findOne(
    db.select().from(T.decks).where(E.eq(T.decks.id, id))
  );
  tinyassert(deck);

  const practiceEntries = await db
    .select()
    .from(T.practiceEntries)
    .where(E.eq(T.practiceEntries.deckId, deck.id));

  const practiceActions = await db
    .select()
    .from(T.practiceActions)
    .where(E.eq(T.practiceActions.deckId, deck.id));

  const bookmarkEntryIds = uniq(practiceEntries.map((e) => e.bookmarkEntryId));
  const bookmarkEntries = await db
    .select()
    .from(T.bookmarkEntries)
    .where(E.inArray(T.bookmarkEntries.id, bookmarkEntryIds));

  const captionEntryIds = uniq(bookmarkEntries.map((e) => e.captionEntryId));
  const captionEntries = await db
    .select()
    .from(T.captionEntries)
    .where(E.inArray(T.captionEntries.id, captionEntryIds));

  const videoIds = uniq(captionEntries.map((e) => e.videoId));
  const videos = await db
    .select()
    .from(T.videos)
    .where(E.inArray(T.videos.id, videoIds));

  return {
    deck,
    practiceEntries,
    practiceActions,
    bookmarkEntries,
    videos,
    captionEntries,
  };
}

export async function importDeck(userId: number, data: ExportDeckData) {
  const user = await findOne(
    db.select().from(T.users).where(E.eq(T.users.id, userId))
  );
  tinyassert(user);

  const {
    deck,
    practiceEntries,
    practiceActions,
    bookmarkEntries,
    videos,
    captionEntries,
  } = data;

  const [deckInsert] = await db.insert(T.decks).values({
    ...objectOmit(deck, ["id"]),
    userId: user.id,
  });

  const [videoInsert] = await db.insert(T.videos).values(
    ...videos.map((e) => ({
      ...objectOmit(e, ["id"]),
      userId: user.id,
    }))
  );
  const videoIdMap = remapInsertId(
    videoInsert.insertId,
    videos.map((e) => e.id)
  );

  const [captionEntryInsert] = await db.insert(T.captionEntries).values(
    ...captionEntries.map((e) => ({
      ...objectOmit(e, ["id"]),
      videoId: videoIdMap.get(e.videoId),
    }))
  );
  const captionEntryIdMap = remapInsertId(
    captionEntryInsert.insertId,
    captionEntries.map((e) => e.id)
  );

  const [bookmarkEntryInsert] = await db.insert(T.bookmarkEntries).values(
    ...bookmarkEntries.map((e) => ({
      ...objectOmit(e, ["id"]),
      userId: user.id,
      videoId: videoIdMap.get(e.videoId),
      captionEntryId: captionEntryIdMap.get(e.captionEntryId),
    }))
  );
  const bookmarkEntryIdMap = remapInsertId(
    bookmarkEntryInsert.insertId,
    bookmarkEntries.map((e) => e.id)
  );

  const [practiceEntriesInsert] = await db.insert(T.practiceEntries).values(
    ...practiceEntries.map((e) => ({
      ...objectOmit(e, ["id"]),
      deckId: deckInsert.insertId,
      bookmarkEntryId: bookmarkEntryIdMap.get(e.bookmarkEntryId),
    }))
  );
  const practiceEntriesIdMap = remapInsertId(
    practiceEntriesInsert.insertId,
    practiceEntries.map((e) => e.id)
  );

  const [practiceActionsInsert] = await db.insert(T.practiceActions).values(
    ...practiceActions.map((e) => ({
      ...objectOmit(e, ["id"]),
      userId: user.id,
      deckId: deckInsert.insertId,
      practiceEntryId: practiceEntriesIdMap.get(e.practiceEntryId),
    }))
  );
  // @ts-expect-error unused
  const practiceActionsIdMap = remapInsertId(
    practiceActionsInsert.insertId,
    practiceActions.map((e) => e.id)
  );
}

//
// utils
//

function remapInsertId(
  insertId: number,
  oldIds: number[]
): UncheckedMap<number, number> {
  return new UncheckedMap(oldIds.map((old, i) => [old, i + insertId]));
}

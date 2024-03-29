import fs from "fs";
import {
  UncheckedMap,
  objectOmit,
  objectPick,
  tinyassert,
  uniq,
} from "@hiogawa/utils";
import { E, T, db, selectOne } from "../db/drizzle-client.server";
import { DEFAULT_DECK_CACHE } from "../db/types";
import { JSON_EXTRA } from "../utils/json-extra";
import { resetDeckCache } from "../utils/practice-system";

//
// export/import all data associated to single deck
//

type ExportDeckData = Awaited<ReturnType<typeof exportDeck>>;

export async function exportDeckJson(id: number) {
  const data = await exportDeck(id);
  return JSON_EXTRA.serialize(data);
}

export async function importDeckJson(userId: number, dataJson: any) {
  const data: any = JSON_EXTRA.deserialize(dataJson);
  return await importDeck(userId, data);
}

async function exportDeck(id: number) {
  const deck = await selectOne(T.decks, E.eq(T.decks.id, id));
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
  const captionEntriesWithBookmark = await db
    .select()
    .from(T.captionEntries)
    .where(E.inArray(T.captionEntries.id, captionEntryIds));

  const videoIds = uniq(captionEntriesWithBookmark.map((e) => e.videoId));
  const videos = await db
    .select()
    .from(T.videos)
    .where(E.inArray(T.videos.id, videoIds));

  const captionEntries = await db
    .select()
    .from(T.captionEntries)
    .where(E.inArray(T.captionEntries.videoId, videoIds));

  return {
    deck,
    practiceEntries,
    practiceActions,
    bookmarkEntries,
    videos,
    captionEntries,
  };
}

async function importDeck(userId: number, data: ExportDeckData) {
  const user = await selectOne(T.users, E.eq(T.users.id, userId));
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
    ...objectPick(deck, [
      "name",
      "newEntriesPerDay",
      "reviewsPerDay",
      "easeMultiplier",
      "easeBonus",
      "randomMode",
    ]),
    userId: user.id,
    cache: DEFAULT_DECK_CACHE,
  });

  const [videoInsert] = await db.insert(T.videos).values(
    videos.map((e) => ({
      ...objectOmit(e, ["id"]),
      userId: user.id,
    }))
  );
  const videoIdMap = remapInsertId(
    videoInsert.insertId,
    videos.map((e) => e.id)
  );

  const [captionEntryInsert] = await db.insert(T.captionEntries).values(
    captionEntries.map((e) => ({
      ...objectOmit(e, ["id"]),
      videoId: videoIdMap.get(e.videoId),
    }))
  );
  const captionEntryIdMap = remapInsertId(
    captionEntryInsert.insertId,
    captionEntries.map((e) => e.id)
  );

  const [bookmarkEntryInsert] = await db.insert(T.bookmarkEntries).values(
    bookmarkEntries.map((e) => ({
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
    practiceEntries.map((e) => ({
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
    practiceActions.map((e) => ({
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

  await resetDeckCache(deckInsert.insertId);

  return deckInsert.insertId;
}

//
// import default seed for testing
//

// make db/seed-download
export const DEFAULT_SEED_FILE = "misc/db/export/ytsub-deck-export--Korean.txt";

export async function importSeed(userId: number) {
  const fileDataRaw = await fs.promises.readFile(DEFAULT_SEED_FILE, "utf-8");
  return await importDeckJson(userId, JSON.parse(fileDataRaw));
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

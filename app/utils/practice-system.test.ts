import { mapGroupBy, tinyassert } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { E, T, db, selectOne } from "../db/drizzle-client.server";
import { DEFAULT_DECK_CACHE } from "../db/types";
import { importSeed } from "../misc/seed-utils";
import { useUser, useUserVideo } from "../misc/test-helper";
import { testTrpcClient } from "../trpc/test-helper";
import {
  PracticeSystem,
  queryNextPracticeEntryRandomModeBatch,
  resetDeckCache,
  updateDeckCache,
} from "./practice-system";

// it doesn't matter yet but make NOW deterministic
const NOW = new Date("2023-04-10T00:00:00Z");

describe("PracticeSystem", () => {
  const hook = useUserVideo({
    seed: __filename,
  });

  async function getStatistics(deckId: number) {
    const trpc = await testTrpcClient({ user: hook.user });
    return trpc.decks_practiceStatistics({ deckId, __now: NOW });
  }

  it("basic", async () => {
    // TODO: move to `use...` helpers
    const [{ insertId: deckId }] = await db.insert(T.decks).values({
      name: __filename,
      userId: hook.user.id,
      cache: DEFAULT_DECK_CACHE,
      randomMode: false,
    });
    const deck = await selectOne(T.decks, E.eq(T.decks.id, deckId));
    tinyassert(deck);

    // TODO: move to `use...` helpers
    const [{ insertId: bookmarkEntryId }] = await db
      .insert(T.bookmarkEntries)
      .values({
        text: "Bonjour à tous",
        side: 0,
        offset: 8,
        userId: hook.user.id,
        videoId: hook.video.id,
        captionEntryId: hook.captionEntries[0].id,
      });
    const bookmarkEntry = await selectOne(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, bookmarkEntryId)
    );
    tinyassert(bookmarkEntry);

    // instantiate practice system
    const system = new PracticeSystem(hook.user, deck);

    // create practice
    const [practiceEntryId] = await system.createPracticeEntries(
      [bookmarkEntry],
      NOW
    );
    tinyassert(practiceEntryId);
    const practiceEntry = await selectOne(
      T.practiceEntries,
      E.eq(T.practiceEntries.id, practiceEntryId)
    );
    tinyassert(practiceEntry);
    expect(await getStatistics(deck.id)).toMatchInlineSnapshot(`
      {
        "daily": {
          "byActionType": {
            "AGAIN": 0,
            "EASY": 0,
            "GOOD": 0,
            "HARD": 0,
          },
          "byQueueType": {
            "LEARN": 0,
            "NEW": 0,
            "REVIEW": 0,
          },
        },
        "total": {
          "byActionType": {
            "AGAIN": 0,
            "EASY": 0,
            "GOOD": 0,
            "HARD": 0,
          },
          "byQueueType": {
            "LEARN": 0,
            "NEW": 1,
            "REVIEW": 0,
          },
        },
      }
    `);

    // receive next practice
    const nextPracticeEntry = await system.getNextPracticeEntry(NOW);
    expect(practiceEntry).toEqual(nextPracticeEntry);

    // answer
    const practiceActionId = await system.createPracticeAction(
      practiceEntry,
      "GOOD",
      NOW
    );
    const practiceAction = await selectOne(
      T.practiceActions,
      E.eq(T.practiceActions.id, practiceActionId)
    );
    tinyassert(practiceAction);
    expect(practiceAction).toMatchObject({
      queueType: "NEW",
      actionType: "GOOD",
    });

    // check counter cache
    const practiceEntryWithActions = await selectOne(
      T.practiceEntries,
      E.eq(T.practiceEntries.id, practiceEntryId)
    );
    tinyassert(practiceEntryWithActions);
    expect(practiceEntryWithActions.practiceActionsCount).toBe(1);

    expect(await getStatistics(deck.id)).toMatchInlineSnapshot(`
      {
        "daily": {
          "byActionType": {
            "AGAIN": 0,
            "EASY": 0,
            "GOOD": 1,
            "HARD": 0,
          },
          "byQueueType": {
            "LEARN": 0,
            "NEW": 1,
            "REVIEW": 0,
          },
        },
        "total": {
          "byActionType": {
            "AGAIN": 0,
            "EASY": 0,
            "GOOD": 1,
            "HARD": 0,
          },
          "byQueueType": {
            "LEARN": 1,
            "NEW": 0,
            "REVIEW": 0,
          },
        },
      }
    `);
  });

  // TODO: setup data
  it("randomMode", async () => {
    const [{ insertId: deckId }] = await db.insert(T.decks).values({
      name: __filename,
      userId: hook.user.id,
      cache: DEFAULT_DECK_CACHE,
      randomMode: true,
    });
    const deck = await selectOne(T.decks, E.eq(T.decks.id, deckId));
    tinyassert(deck);

    // instantiate practice system
    const system = new PracticeSystem(hook.user, deck);
    const entry = await system.getNextPracticeEntry(NOW);
    expect(entry).toBe(undefined);
  });
});

describe("cache.nextEntriesRandomMode", () => {
  const userHook = useUser({
    seed: __filename + "randomMode",
  });
  let deckId: number;

  beforeAll(async () => {
    await userHook.isReady;
    deckId = await importSeed(userHook.data.id);
  });

  async function loadDeck() {
    const deck = await selectOne(T.decks, E.eq(T.decks.id, deckId));
    tinyassert(deck);
    return deck;
  }

  it("basic", async () => {
    // no cache initially
    const deck = await loadDeck();
    expect(deck.cache.nextEntriesRandomMode.length).toMatchInlineSnapshot("0");

    // get next
    const system = new PracticeSystem(userHook.data, deck);
    const entry1 = await system.getNextPracticeEntry();
    tinyassert(entry1);

    // build cache
    const deck1 = await loadDeck();
    expect(deck1.cache.nextEntriesRandomMode.length).toMatchInlineSnapshot(
      "25"
    );
    expect(deck1.cache.nextEntriesRandomMode[0]).toBe(entry1.id);

    // cache shifts after action
    await system.createPracticeAction(entry1, "HARD");
    const deck2 = await loadDeck();
    expect(deck2.cache.nextEntriesRandomMode.length).toMatchInlineSnapshot(
      "24"
    );
    expect(deck2.cache.nextEntriesRandomMode).toEqual(
      deck1.cache.nextEntriesRandomMode.slice(1)
    );

    // get next with cache
    const entry2 = await system.getNextPracticeEntry();
    tinyassert(entry2);
    expect(deck2.cache.nextEntriesRandomMode[0]).toBe(entry2.id);

    const deck3 = await loadDeck();
    expect(deck2).toEqual(deck3);
  });
});

describe("queryNextPracticeEntryRandomModeBatch", () => {
  const userHook = useUser({
    seed: __filename + "randomMode",
  });
  let deckId: number;

  beforeAll(async () => {
    await userHook.isReady;
    deckId = await importSeed(userHook.data.id);
  });

  it("basic", async () => {
    const now = new Date("2023-04-01T00:00:00.000Z");

    // check variation of queue type
    async function run(count: number, seed: number) {
      const rows = await queryNextPracticeEntryRandomModeBatch(
        deckId,
        now,
        count,
        seed
      );
      return mapGroupBy(
        rows,
        (row) => row.queueType,
        (rows) => rows.length
      );
    }

    expect(await run(30, 1)).toMatchInlineSnapshot(`
      Map {
        "REVIEW" => 2,
        "NEW" => 27,
        "LEARN" => 1,
      }
    `);
    expect(await run(30, 2)).toMatchInlineSnapshot(`
      Map {
        "NEW" => 27,
        "LEARN" => 3,
      }
    `);
  });
});

describe("DeckCache", () => {
  const userHook = useUser({
    seed: __filename + "randomMode",
  });
  let deckId: number;

  beforeAll(async () => {
    await userHook.isReady;
    deckId = await importSeed(userHook.data.id);
  });

  async function getDeck() {
    const deck = await selectOne(T.decks, E.eq(T.decks.id, deckId));
    tinyassert(deck);
    return deck;
  }

  it("basic", async () => {
    await resetDeckCache(deckId);
    let deck = await getDeck();
    expect(deck.cache).toMatchInlineSnapshot(`
      {
        "nextEntriesRandomMode": [],
        "practiceActionsCountByActionType": {
          "AGAIN": 128,
          "EASY": 0,
          "GOOD": 55,
          "HARD": 64,
        },
        "practiceEntriesCountByQueueType": {
          "LEARN": 187,
          "NEW": 140,
          "REVIEW": 13,
        },
      }
    `);

    await updateDeckCache(deckId, { LEARN: 1, NEW: -1 }, { GOOD: 1 });
    deck = await getDeck();
    expect(deck.cache).toMatchInlineSnapshot(`
      {
        "nextEntriesRandomMode": [],
        "practiceActionsCountByActionType": {
          "AGAIN": 128,
          "EASY": 0,
          "GOOD": 56,
          "HARD": 64,
        },
        "practiceEntriesCountByQueueType": {
          "LEARN": 188,
          "NEW": 139,
          "REVIEW": 13,
        },
      }
    `);
  });
});

import { groupBy, mapValues, range, tinyassert, uniq } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { E, T, TT, db, findOne } from "../db/drizzle-client.server";
import { Q } from "../db/models";
import { DEFAULT_DECK_CACHE } from "../db/types";
import { importSeed } from "../misc/seed-utils";
import { useUser, useUserVideo } from "../misc/test-helper";
import { testTrpcClient } from "../trpc/test-helper";
import {
  PracticeSystem,
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
    const deck = await Q.decks().where({ id: deckId }).first();
    tinyassert(deck);

    // TODO: move to `use...` helpers
    const [bookmarkEntryId] = await Q.bookmarkEntries().insert({
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
      userId: hook.user.id,
      videoId: hook.video.id,
      captionEntryId: hook.captionEntries[0].id,
    });
    const bookmarkEntry = await Q.bookmarkEntries()
      .where({ id: bookmarkEntryId })
      .first();
    tinyassert(bookmarkEntry);

    // instantiate practice system
    const system = new PracticeSystem(hook.user, deck);

    // create practice
    const [practiceEntryId] = await system.createPracticeEntries(
      [bookmarkEntry],
      NOW
    );
    tinyassert(practiceEntryId);
    const practiceEntry = await Q.practiceEntries()
      .where({ id: practiceEntryId })
      .first();
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
    const practiceAction = await Q.practiceActions()
      .where({ id: practiceActionId })
      .first();
    tinyassert(practiceAction);
    expect(practiceAction).toMatchObject({
      queueType: "NEW",
      actionType: "GOOD",
    });

    // check counter cache
    const practiceEntryWithActions = await Q.practiceEntries()
      .where({ id: practiceEntryId })
      .first();
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
    const deck = await Q.decks().where({ id: deckId }).first();
    tinyassert(deck);

    // instantiate practice system
    const system = new PracticeSystem(hook.user, deck);
    const entry = await system.getNextPracticeEntry(NOW);
    expect(entry).toBe(undefined);
  });
});

describe("randomMode", () => {
  const userHook = useUser({
    seed: __filename + "randomMode",
  });
  let deckId: number;

  beforeAll(async () => {
    await userHook.isReady;
    deckId = await importSeed(userHook.data.id);
  });

  it("practice loop", async () => {
    const deck = await findOne(
      db.select().from(T.decks).where(E.eq(T.decks.id, deckId))
    );
    tinyassert(deck);
    const system = new PracticeSystem(userHook.data, deck);

    const entries: TT["practiceEntries"][] = [];
    for (const i of range(200)) {
      system.__seed = i; // make deterministic
      const entry = await system.getNextPracticeEntry();
      tinyassert(entry);
      entries.push(entry);
      await system.createPracticeAction(entry, "HARD");
    }

    // NEW should be picked most often
    const countMap = mapValues(
      groupBy(entries, (e) => e.queueType),
      (group) => group.length
    );
    expect(countMap).toMatchInlineSnapshot(`
      Map {
        "NEW" => 140,
        "LEARN" => 51,
        "REVIEW" => 9,
      }
    `);

    // should pick mostly random practice entries
    expect(uniq(entries.map((e) => e.id)).length).toMatchInlineSnapshot("143");
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
    const deck = await findOne(
      db.select().from(T.decks).where(E.eq(T.decks.id, deckId))
    );
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

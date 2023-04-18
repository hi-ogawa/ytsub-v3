import {
  DefaultMap,
  groupBy,
  mapValues,
  objectPick,
  range,
  tinyassert,
  uniq,
} from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { E, T, TT, db, findOne } from "../db/drizzle-client.server";
import { Q } from "../db/models";
import { importSeed } from "../misc/seed-utils";
import { useUser, useUserVideo } from "../misc/test-helper";
import {
  PracticeSystem,
  queryNextPracticeEntryRandomMode,
} from "./practice-system";

// >>> import datetime
// >>> datetime.datetime(year=1991, month=6, day=24, tzinfo=datetime.timezone.utc).timestamp()
// 677721600.0
const NOW = new Date(677721600 * 1000);

describe("PracticeSystem", () => {
  const hook = useUserVideo({
    seed: __filename,
  });

  it("basic", async () => {
    // TODO: move to `use...` helpers
    const [deckId] = await Q.decks().insert({
      userId: hook.user.id,
      name: __filename,
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
    expect(await system.getStatistics(NOW)).toMatchInlineSnapshot(`
      {
        "LEARN": {
          "daily": 0,
          "total": 0,
        },
        "NEW": {
          "daily": 0,
          "total": 1,
        },
        "REVIEW": {
          "daily": 0,
          "total": 0,
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

    const statistics = await system.getStatistics(NOW);
    expect(statistics).toMatchInlineSnapshot(`
      {
        "LEARN": {
          "daily": 0,
          "total": 1,
        },
        "NEW": {
          "daily": 1,
          "total": 0,
        },
        "REVIEW": {
          "daily": 0,
          "total": 0,
        },
      }
    `);
  });

  // TODO: setup data
  it("randomMode", async () => {
    const [deckId] = await Q.decks().insert({
      userId: hook.user.id,
      name: __filename,
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
    // loop practice N times
    const n = 100;
    for (const _ of range(n)) {
      const entry = await system.getNextPracticeEntry();
      tinyassert(entry);
      entries.push(entry);
      await system.createPracticeAction(entry, "GOOD");
      deck.updatedAt = new Date(deck.updatedAt.getTime() + 1); // force mutating seed since `updateAt` is not precise enough
    }
    // NEW should be picked most often
    const countMap = new DefaultMap(
      () => 0,
      [
        ...mapValues(
          groupBy(entries, (e) => e.queueType),
          (group) => group.length
        ),
      ]
    );
    expect(countMap.get("NEW")).greaterThan(countMap.get("LEARN"));
    expect(countMap.get("NEW")).greaterThan(countMap.get("REVIEW"));
    // should pick mostly random practice entries
    expect(uniq(entries.map((e) => e.id)).length).greaterThan(n - 5);
  });
});

describe("queryNextPracticeEntryRandomMode", () => {
  const userHook = useUser({
    seed: __filename + "randomMode",
  });
  let deckId: number;

  beforeAll(async () => {
    await userHook.isReady;
    deckId = await importSeed(userHook.data.id);
  });

  it("basic", async () => {
    const now = new Date("2023-04-10T00:00:00Z");
    const seed = 0;
    const rows = await queryNextPracticeEntryRandomMode(deckId, now, seed);
    expect(rows.length).toMatchInlineSnapshot("339");
    console.log(rows);
    console.log(
      rows.map((row) =>
        objectPick(row, ["queueType", "id", "updatedAt", "randomModeScore"])
      )
    );
  });
});

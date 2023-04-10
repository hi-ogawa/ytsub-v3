import { tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { useUserVideo } from "../../misc/test-helper";
import { PracticeSystem } from "../practice-system";

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

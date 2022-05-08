import { describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { assert } from "../../misc/assert";
import { useUserVideo } from "../../routes/__tests__/helper";
import { PracticeSystem } from "../practice-system";

// >>> import datetime
// >>> datetime.datetime(year=1991, month=6, day=24, tzinfo=datetime.timezone.utc).timestamp()
// 677721600.0
const NOW = new Date(677721600 * 1000);

describe("PracticeSystem", () => {
  const { user, video, captionEntries } = useUserVideo(2, {
    seed: __filename,
  });

  it("basic", async () => {
    // TODO: move to `use...` helpers
    const [deckId] = await Q.decks().insert({
      userId: user().id,
      name: __filename,
    });
    const deck = await Q.decks().where({ id: deckId }).first();
    assert(deck);

    // TODO: move to `use...` helpers
    const [bookmarkEntryId] = await Q.bookmarkEntries().insert({
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
      userId: user().id,
      videoId: video().id,
      captionEntryId: captionEntries()[0].id,
    });
    const bookmarkEntry = await Q.bookmarkEntries()
      .where({ id: bookmarkEntryId })
      .first();
    assert(bookmarkEntry);

    // instantiate practice system
    const system = new PracticeSystem(user(), deck);

    // create practice
    const [practiceEntryId] = await system.createPracticeEntries(
      [bookmarkEntry],
      NOW
    );
    assert(practiceEntryId);
    const practiceEntry = await Q.practiceEntries()
      .where({ id: practiceEntryId })
      .first();
    assert(practiceEntry);

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
    assert(practiceAction);
    expect(practiceAction).toMatchObject({
      queueType: "NEW",
      actionType: "GOOD",
    });

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
      userId: user().id,
      name: __filename,
      randomMode: true,
    });
    const deck = await Q.decks().where({ id: deckId }).first();
    assert(deck);

    // instantiate practice system
    const system = new PracticeSystem(user(), deck);
    const entry = await system.getNextPracticeEntry(NOW);
    expect(entry).toBe(undefined);
  });
});

import { describe, expect, it } from "vitest";
import { Q } from "../../../db/models";
import { testLoader, useUser } from "../../../misc/test-helper";
import { sha256 } from "../../../utils/auth";
import { loader } from "./history-graph";

describe("decks/id/history-graph.loader", () => {
  const user = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const [deckId] = await Q.decks().insert({
      name: "test-" + sha256(__filename),
      newEntriesPerDay: 20,
      reviewsPerDay: 200,
      easeMultiplier: 1.5,
      easeBonus: 2,
      userId: user.data.id,
    });
    const res = await testLoader(loader, {
      params: { id: String(deckId) },
      query: { now: new Date("2022-05-13T07:00:00+09:00"), page: 1 },
      transform: user.signin,
    });
    const resJson = await res.json();
    expect(resJson?.json?.datasetSource).toMatchInlineSnapshot(`
      [
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-04-29",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-04-30",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-05-01",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-05-02",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-05-03",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-05-04",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2022-05-05",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
      ]
    `);
  });
});

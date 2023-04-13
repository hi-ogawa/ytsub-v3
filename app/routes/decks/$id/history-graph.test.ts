import { beforeAll, describe, expect, it } from "vitest";
import { importSeed } from "../../../misc/seed-utils";
import { testLoader, useUser } from "../../../misc/test-helper";
import { loader } from "./history-graph";

describe("decks/id/history-graph.loader", () => {
  const user = useUser({
    seed: __filename,
  });
  let deckId: number;

  beforeAll(async () => {
    await user.isReady;
    deckId = await importSeed(user.data.id);
  });

  it("basic", async () => {
    const res = await testLoader(loader, {
      params: { id: String(deckId) },
      query: { now: new Date("2023-04-11T12:00:00+09:00"), page: 3 },
      transform: user.signin,
    });
    const resJson = await res.json();
    expect(resJson?.json?.datasetSource).toMatchInlineSnapshot(`
      [
        {
          "action-AGAIN": 7,
          "action-EASY": 0,
          "action-GOOD": 1,
          "action-HARD": 1,
          "date": "2023-03-20",
          "queue-LEARN": 4,
          "queue-NEW": 4,
          "queue-REVIEW": 1,
          "total": 9,
        },
        {
          "action-AGAIN": 13,
          "action-EASY": 0,
          "action-GOOD": 3,
          "action-HARD": 6,
          "date": "2023-03-21",
          "queue-LEARN": 2,
          "queue-NEW": 20,
          "queue-REVIEW": 0,
          "total": 22,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2023-03-22",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 17,
          "action-EASY": 0,
          "action-GOOD": 7,
          "action-HARD": 6,
          "date": "2023-03-23",
          "queue-LEARN": 8,
          "queue-NEW": 19,
          "queue-REVIEW": 3,
          "total": 30,
        },
        {
          "action-AGAIN": 0,
          "action-EASY": 0,
          "action-GOOD": 0,
          "action-HARD": 0,
          "date": "2023-03-24",
          "queue-LEARN": 0,
          "queue-NEW": 0,
          "queue-REVIEW": 0,
          "total": 0,
        },
        {
          "action-AGAIN": 10,
          "action-EASY": 0,
          "action-GOOD": 7,
          "action-HARD": 6,
          "date": "2023-03-25",
          "queue-LEARN": 1,
          "queue-NEW": 21,
          "queue-REVIEW": 1,
          "total": 23,
        },
        {
          "action-AGAIN": 12,
          "action-EASY": 0,
          "action-GOOD": 9,
          "action-HARD": 5,
          "date": "2023-03-26",
          "queue-LEARN": 2,
          "queue-NEW": 24,
          "queue-REVIEW": 0,
          "total": 26,
        },
      ]
    `);
  });
});

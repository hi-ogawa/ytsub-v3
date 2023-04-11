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
          "action-AGAIN": 3,
          "action-EASY": 0,
          "action-GOOD": 1,
          "action-HARD": 10,
          "date": "2023-03-15",
          "queue-LEARN": 4,
          "queue-NEW": 10,
          "queue-REVIEW": 0,
          "total": 14,
        },
        {
          "action-AGAIN": 8,
          "action-EASY": 0,
          "action-GOOD": 1,
          "action-HARD": 2,
          "date": "2023-03-16",
          "queue-LEARN": 3,
          "queue-NEW": 8,
          "queue-REVIEW": 0,
          "total": 11,
        },
        {
          "action-AGAIN": 1,
          "action-EASY": 0,
          "action-GOOD": 1,
          "action-HARD": 2,
          "date": "2023-03-17",
          "queue-LEARN": 0,
          "queue-NEW": 3,
          "queue-REVIEW": 1,
          "total": 4,
        },
        {
          "action-AGAIN": 5,
          "action-EASY": 0,
          "action-GOOD": 3,
          "action-HARD": 2,
          "date": "2023-03-18",
          "queue-LEARN": 0,
          "queue-NEW": 9,
          "queue-REVIEW": 1,
          "total": 10,
        },
        {
          "action-AGAIN": 6,
          "action-EASY": 0,
          "action-GOOD": 2,
          "action-HARD": 3,
          "date": "2023-03-19",
          "queue-LEARN": 0,
          "queue-NEW": 10,
          "queue-REVIEW": 1,
          "total": 11,
        },
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
      ]
    `);
  });
});

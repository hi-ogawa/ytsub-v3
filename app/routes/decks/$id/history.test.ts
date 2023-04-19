import { tinyassert } from "@hiogawa/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { E, T, db } from "../../../db/drizzle-client.server";
import { testLoader, useUser } from "../../../misc/test-helper";
import { loader } from "./history";

describe("decks/id/history.loader", () => {
  const user = useUser({
    seed: __filename,
  });
  let deckId: number;

  beforeAll(async () => {
    await user.isReady;
    [{ insertId: deckId }] = await db.insert(T.decks).values({
      name: "test",
      newEntriesPerDay: 20,
      reviewsPerDay: 200,
      easeMultiplier: 1.5,
      easeBonus: 2,
      userId: user.data.id,
    });
  });

  afterAll(async () => {
    await db.delete(T.decks).where(E.eq(T.decks.id, deckId));
  });

  it("basic", async () => {
    const res = await testLoader(loader, {
      params: { id: String(deckId) },
      transform: user.signin,
    });
    tinyassert(res instanceof Response);
    tinyassert(res.ok);
    const resJson = await res.json();
    resJson.json.deck.createdAt =
      resJson.json.deck.updatedAt =
      resJson.json.deck.userId =
      resJson.json.deck.id =
        "...";
    expect(resJson).toMatchInlineSnapshot(`
      {
        "json": {
          "deck": {
            "createdAt": "...",
            "easeBonus": 2,
            "easeMultiplier": 1.5,
            "id": "...",
            "name": "test",
            "newEntriesPerDay": 20,
            "practiceEntriesCountByQueueType": {
              "LEARN": 0,
              "NEW": 0,
              "REVIEW": 0,
            },
            "randomMode": false,
            "reviewsPerDay": 200,
            "updatedAt": "...",
            "userId": "...",
          },
          "pagination": {
            "page": 1,
            "perPage": 20,
            "total": 0,
            "totalPage": 0,
          },
          "query": {
            "page": 1,
            "perPage": 20,
          },
          "rows": [],
        },
        "meta": {
          "values": {
            "deck.createdAt": [
              "Date",
            ],
            "deck.updatedAt": [
              "Date",
            ],
          },
        },
      }
    `);
  });
});

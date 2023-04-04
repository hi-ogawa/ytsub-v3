import { describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { loader } from "../decks/$id/history";
import { testLoader, useUser } from "./helper";

describe("decks/id/history.loader", () => {
  const { user, signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const userId = user().id;
    const [deckId] = await Q.decks().insert({
      name: "test",
      newEntriesPerDay: 20,
      reviewsPerDay: 200,
      easeMultiplier: 1.5,
      easeBonus: 2,
      userId,
    });
    const res = await testLoader(loader, {
      params: { id: String(deckId) },
      transform: signin,
    });
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

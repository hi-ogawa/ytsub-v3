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
    expect(await res.json()).toMatchObject({
      json: {
        deck: {
          easeBonus: 2,
          easeMultiplier: 1.5,
          id: deckId,
          name: "test",
          newEntriesPerDay: 20,
          reviewsPerDay: 200,
          userId: userId,
        },
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
          totalPage: 0,
        },
        practiceActions: [],
      },
      meta: {
        values: {
          "deck.createdAt": ["Date"],
          "deck.updatedAt": ["Date"],
        },
      },
    });
  });
});

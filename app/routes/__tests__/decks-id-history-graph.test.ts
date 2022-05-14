import { describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { sha256 } from "../../utils/auth";
import { loader } from "../decks/$id/history-graph";
import { testLoader, useUser } from "./helper";

describe("decks/id/history-graph.loader", () => {
  const { user, signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const userId = user().id;
    const [deckId] = await Q.decks().insert({
      name: "test-" + sha256(__filename),
      newEntriesPerDay: 20,
      reviewsPerDay: 200,
      easeMultiplier: 1.5,
      easeBonus: 2,
      userId,
    });
    const res = await testLoader(loader, {
      params: { id: String(deckId) },
      query: { now: new Date("2022-05-13T07:00:00+09:00"), page: 1 },
      transform: signin,
    });
    const resJson = await res.json();
    expect(resJson?.json?.data).toMatchInlineSnapshot(`
      [
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-04-30",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-01",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-02",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-03",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-04",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-05",
          "total": 0,
        },
        {
          "LEARN": 0,
          "NEW": 0,
          "REVIEW": 0,
          "date": "2022-05-06",
          "total": 0,
        },
      ]
    `);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { getSchema } from "../../misc/cli";
import { restoreDump } from "../../misc/test-setup-global-e2e";
import { client } from "../client.server";
import { Q, deleteOrphans, normalizeRelation } from "../models";
import RAW_SCHEMA from "../schema";

describe("models-basic", () => {
  beforeEach(async () => {
    await Q.users().delete();
  });

  it("basic", async () => {
    const res = await Q.users();
    expect(res).toMatchInlineSnapshot("[]");
  });

  it("insert-single", async () => {
    const data = {
      username: "root",
      passwordHash: "xyz",
      language1: "fr",
      language2: "en",
      timezone: "+09:00",
    };
    const [id] = await Q.users().insert(data);
    const res = await Q.users().where("id", id).first();
    assert(res);
    expect(res).toMatchObject(data);
  });

  // cf.
  // https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
  // https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
  it("insert-multiple", async () => {
    const data = [
      {
        username: "user0",
        passwordHash: "x",
      },
      {
        username: "user1",
        passwordHash: "y",
      },
    ];
    const ids = await Q.users().insert(data);
    expect(ids.length).toBe(1);

    const res = await Q.users().whereIn("id", [ids[0], ids[0] + 1]);
    expect(res).toMatchObject(data);
  });

  it("count", async () => {
    const query = Q.users().count({ total: 0 }).first();
    expect(query.toSQL().sql).toMatchInlineSnapshot(
      '"select count(0) as `total` from `users` limit ?"'
    );
    const res = await query;
    assert(res);
    assert(typeof res.total === "number");
  });

  it("deleteOrphans", async () => {
    await deleteOrphans();
  });

  it("SCHEMA", async () => {
    // run `npm run dump-schema` to update "schema.ts"
    const expected = await getSchema({
      includeKnex: false,
      showCreateTable: false,
    });
    expect(expected).toEqual(RAW_SCHEMA);
  });
});

describe("models-with-dump", () => {
  beforeAll(async () => {
    await restoreDump();
  });

  afterAll(async () => {
    await Q.users().delete().where("username", "dev");
    await deleteOrphans();
  });

  it("normalizeRelation", async () => {
    const qb = Q.practiceEntries()
      .join(
        "bookmarkEntries",
        "bookmarkEntries.id",
        "practiceEntries.bookmarkEntryId"
      )
      .join("users", "users.id", "bookmarkEntries.userId")
      .join("decks", "decks.id", "practiceEntries.deckId")
      .join(
        "practiceActions",
        "practiceActions.practiceEntryId",
        "practiceEntries.id"
      )
      .where("users.username", "dev")
      .groupBy("practiceEntries.id")
      .orderBy([
        {
          column: "practiceActionsCount",
          order: "desc",
        },
        {
          column: "practiceEntries.id",
          order: "asc",
        },
      ])
      .limit(2);
    const data = await normalizeRelation(
      qb,
      ["bookmarkEntries", "practiceEntries", "users", "decks"],
      {
        selectExtra: {
          practiceActionsCount: client.raw("COUNT(practiceActions.id)"),
        },
      }
    );
    expect(data).toMatchInlineSnapshot(`
      {
        "bookmarkEntries": [
          {
            "captionEntryId": 6127,
            "createdAt": 2022-04-17T22:10:42.000Z,
            "id": 314,
            "offset": 28,
            "practiceActionsCount": 3,
            "side": 0,
            "text": "passer sous une échelle",
            "updatedAt": 2022-04-17T22:10:42.000Z,
            "userId": 1,
            "videoId": 58,
          },
          {
            "captionEntryId": 6128,
            "createdAt": 2022-04-17T22:11:43.000Z,
            "id": 315,
            "offset": 2,
            "practiceActionsCount": 2,
            "side": 0,
            "text": " j'ai peur de casser un miroir parce qu'on dit qu'on aura 7 ans de malheur.",
            "updatedAt": 2022-04-17T22:11:43.000Z,
            "userId": 1,
            "videoId": 58,
          },
        ],
        "decks": [
          {
            "createdAt": 2022-04-23T08:07:33.000Z,
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": 1,
            "name": "test-main",
            "newEntriesPerDay": 50,
            "practiceActionsCount": 3,
            "practiceEntriesCountByQueueType": {
              "LEARN": 64,
              "NEW": 78,
              "REVIEW": 22,
            },
            "randomMode": 1,
            "reviewsPerDay": 200,
            "updatedAt": 2022-07-09T08:00:11.000Z,
            "userId": 1,
          },
          {
            "createdAt": 2022-04-23T08:07:33.000Z,
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": 1,
            "name": "test-main",
            "newEntriesPerDay": 50,
            "practiceActionsCount": 2,
            "practiceEntriesCountByQueueType": {
              "LEARN": 64,
              "NEW": 78,
              "REVIEW": 22,
            },
            "randomMode": 1,
            "reviewsPerDay": 200,
            "updatedAt": 2022-07-09T08:00:11.000Z,
            "userId": 1,
          },
        ],
        "practiceEntries": [
          {
            "bookmarkEntryId": 314,
            "createdAt": 2022-04-23T08:07:50.000Z,
            "deckId": 1,
            "easeFactor": 2,
            "id": 1,
            "practiceActionsCount": 3,
            "queueType": "REVIEW",
            "scheduledAt": 2022-05-19T12:55:49.000Z,
            "updatedAt": 2022-05-18T12:55:49.000Z,
          },
          {
            "bookmarkEntryId": 315,
            "createdAt": 2022-04-23T08:07:50.000Z,
            "deckId": 1,
            "easeFactor": 2,
            "id": 2,
            "practiceActionsCount": 2,
            "queueType": "REVIEW",
            "scheduledAt": 2022-05-11T14:23:25.000Z,
            "updatedAt": 2022-05-10T14:23:25.000Z,
          },
        ],
        "users": [
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "practiceActionsCount": 3,
            "timezone": "+09:00",
            "updatedAt": 2022-05-28T06:44:50.000Z,
            "username": "dev",
          },
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "practiceActionsCount": 2,
            "timezone": "+09:00",
            "updatedAt": 2022-05-28T06:44:50.000Z,
            "username": "dev",
          },
        ],
      }
    `);
  });
});

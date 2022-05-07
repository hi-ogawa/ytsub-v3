import { omit } from "lodash";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { getSchema } from "../../misc/cli";
import { restoreDump } from "../../misc/test-setup-global-e2e";
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
    };
    const [id] = await Q.users().insert(data);
    const res = await Q.users().where("id", id).first();
    assert(res);
    expect(omit(res, ["id", "createdAt", "updatedAt"])).toEqual(data);
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

  it("normalizeRelation-has-one", async () => {
    const qb = Q.practiceEntries()
      .join(
        "bookmarkEntries",
        "bookmarkEntries.id",
        "practiceEntries.bookmarkEntryId"
      )
      .join("users", "users.id", "bookmarkEntries.userId")
      .join("decks", "decks.id", "practiceEntries.deckId")
      .where("users.username", "dev")
      .orderBy("bookmarkEntries.createdAt", "asc")
      .limit(2);
    const data = await normalizeRelation(qb, [
      "bookmarkEntries",
      "practiceEntries",
      "users",
      "decks",
    ]);
    expect(data).toMatchInlineSnapshot(`
      {
        "bookmarkEntries": [
          {
            "captionEntryId": 6127,
            "createdAt": 2022-04-17T22:10:42.000Z,
            "id": 314,
            "offset": 28,
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
            "reviewsPerDay": 200,
            "updatedAt": 2022-05-03T04:16:56.000Z,
            "userId": 1,
          },
          {
            "createdAt": 2022-04-23T08:07:33.000Z,
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": 1,
            "name": "test-main",
            "newEntriesPerDay": 50,
            "reviewsPerDay": 200,
            "updatedAt": 2022-05-03T04:16:56.000Z,
            "userId": 1,
          },
        ],
        "practiceEntries": [
          {
            "bookmarkEntryId": 314,
            "createdAt": 2022-04-23T08:07:50.000Z,
            "deckId": 1,
            "easeFactor": 1,
            "id": 1,
            "queueType": "LEARN",
            "scheduledAt": 2022-05-04T19:22:16.000Z,
            "updatedAt": 2022-05-04T10:17:16.000Z,
          },
          {
            "bookmarkEntryId": 315,
            "createdAt": 2022-04-23T08:07:50.000Z,
            "deckId": 1,
            "easeFactor": 1,
            "id": 2,
            "queueType": "LEARN",
            "scheduledAt": 2022-04-25T09:25:12.000Z,
            "updatedAt": 2022-04-24T09:25:13.000Z,
          },
        ],
        "users": [
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "updatedAt": 2022-05-03T06:20:33.000Z,
            "username": "dev",
          },
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "updatedAt": 2022-05-03T06:20:33.000Z,
            "username": "dev",
          },
        ],
      }
    `);
  });
});

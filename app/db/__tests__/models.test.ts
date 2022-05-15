import { omit } from "lodash";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getSchema } from "../../misc/cli";
import { restoreDump } from "../../misc/test-setup-global-e2e";
import { tinyassert } from "../../misc/tinyassert";
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
    };
    const [id] = await Q.users().insert(data);
    const res = await Q.users().where("id", id).first();
    tinyassert(res);
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
    tinyassert(res);
    tinyassert(typeof res.total === "number");
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
      .leftJoin(
        "practiceActions",
        "practiceActions.practiceEntryId",
        "practiceEntries.id"
      )
      .where("users.username", "dev")
      .groupBy("practiceEntries.id")
      .orderBy("bookmarkEntries.createdAt", "asc")
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
            "captionEntryId": 4174,
            "createdAt": 2022-04-14T14:56:10.000Z,
            "id": 106,
            "offset": 17,
            "practiceActionsCount": 0,
            "side": 0,
            "text": "je l'ai invité à boire un verre  mais il m'a dit non. Je me suis pris un râteau",
            "updatedAt": 2022-04-14T14:56:10.000Z,
            "userId": 1,
            "videoId": 41,
          },
          {
            "captionEntryId": 4176,
            "createdAt": 2022-04-14T14:56:10.000Z,
            "id": 104,
            "offset": 0,
            "practiceActionsCount": 0,
            "side": 0,
            "text": "d'enfiler un chapeau et une veste en cuir pour  aller traquer des nazis en Égypte",
            "updatedAt": 2022-04-14T14:56:10.000Z,
            "userId": 1,
            "videoId": 41,
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
            "practiceActionsCount": 0,
            "randomMode": 0,
            "reviewsPerDay": 200,
            "updatedAt": 2022-05-08T10:51:22.000Z,
            "userId": 1,
          },
          {
            "createdAt": 2022-04-23T08:07:33.000Z,
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": 1,
            "name": "test-main",
            "newEntriesPerDay": 50,
            "practiceActionsCount": 0,
            "randomMode": 0,
            "reviewsPerDay": 200,
            "updatedAt": 2022-05-08T10:51:22.000Z,
            "userId": 1,
          },
        ],
        "practiceEntries": [
          {
            "bookmarkEntryId": 106,
            "createdAt": 2022-05-08T10:21:23.000Z,
            "deckId": 1,
            "easeFactor": 1,
            "id": 99,
            "practiceActionsCount": 0,
            "queueType": "NEW",
            "scheduledAt": 2022-05-08T10:21:23.000Z,
            "updatedAt": 2022-05-08T10:21:23.000Z,
          },
          {
            "bookmarkEntryId": 104,
            "createdAt": 2022-05-08T10:21:23.000Z,
            "deckId": 1,
            "easeFactor": 1,
            "id": 100,
            "practiceActionsCount": 0,
            "queueType": "NEW",
            "scheduledAt": 2022-05-08T10:21:23.000Z,
            "updatedAt": 2022-05-08T10:21:23.000Z,
          },
        ],
        "users": [
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "practiceActionsCount": 0,
            "updatedAt": 2022-05-03T06:20:33.000Z,
            "username": "dev",
          },
          {
            "createdAt": 2022-04-02T09:14:47.000Z,
            "id": 1,
            "language1": "fr",
            "language2": "en",
            "passwordHash": "\$2a\$10\$WPTRk4ui.NI6RE9OnbN/u.a6mhVfn3hkMSSQ0k86UXf/uw.PNRv6K",
            "practiceActionsCount": 0,
            "updatedAt": 2022-05-03T06:20:33.000Z,
            "username": "dev",
          },
        ],
      }
    `);
  });
});

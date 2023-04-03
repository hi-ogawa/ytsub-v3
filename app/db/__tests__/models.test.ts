import { tinyassert } from "@hiogawa/utils";
import { mapValues } from "lodash";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getSchema } from "../../misc/cli";
import { importSeed } from "../../misc/seed-utils";
import { useUser } from "../../routes/__tests__/helper";
import { client } from "../client.server";
import { Q, deleteOrphans, normalizeRelation } from "../models";
import RAW_SCHEMA from "../schema";

// TODO: remove
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
    tinyassert(res);
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
  const user = useUser({ username: "username-models-with-dump" });

  beforeAll(async () => {
    await user.isReady;
    await importSeed(user.data.id);
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
      .where("users.username", user.data.username)
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
    // remove "non-deterministic" properties
    const keys = [
      "id",
      "userId",
      "videoId",
      "captionEntryId",
      "deckId",
      "bookmarkEntryId",
      "createdAt",
      "updatedAt",
      "passwordHash",
    ];
    const data2 = mapValues(data, (v) =>
      v.map((v) => mapValues(v, (v, k) => (keys.includes(k) ? "(id)" : v)))
    );
    expect(data2).toMatchInlineSnapshot(`
      {
        "bookmarkEntries": [
          {
            "captionEntryId": "(id)",
            "createdAt": "(id)",
            "id": "(id)",
            "offset": 0,
            "practiceActionsCount": 7,
            "side": 0,
            "text": "저희 인사드리겠습니다 둘 셋!",
            "updatedAt": "(id)",
            "userId": "(id)",
            "videoId": "(id)",
          },
          {
            "captionEntryId": "(id)",
            "createdAt": "(id)",
            "id": "(id)",
            "offset": 13,
            "practiceActionsCount": 4,
            "side": 0,
            "text": "막내",
            "updatedAt": "(id)",
            "userId": "(id)",
            "videoId": "(id)",
          },
        ],
        "decks": [
          {
            "createdAt": "(id)",
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": "(id)",
            "name": "Korean",
            "newEntriesPerDay": 50,
            "practiceActionsCount": 7,
            "practiceEntriesCountByQueueType": {
              "LEARN": 187,
              "NEW": 140,
              "REVIEW": 13,
            },
            "randomMode": 1,
            "reviewsPerDay": 200,
            "updatedAt": "(id)",
            "userId": "(id)",
          },
          {
            "createdAt": "(id)",
            "easeBonus": 1.5,
            "easeMultiplier": 2,
            "id": "(id)",
            "name": "Korean",
            "newEntriesPerDay": 50,
            "practiceActionsCount": 4,
            "practiceEntriesCountByQueueType": {
              "LEARN": 187,
              "NEW": 140,
              "REVIEW": 13,
            },
            "randomMode": 1,
            "reviewsPerDay": 200,
            "updatedAt": "(id)",
            "userId": "(id)",
          },
        ],
        "practiceEntries": [
          {
            "bookmarkEntryId": "(id)",
            "createdAt": "(id)",
            "deckId": "(id)",
            "easeFactor": 32,
            "id": "(id)",
            "practiceActionsCount": 7,
            "queueType": "REVIEW",
            "scheduledAt": 2023-04-17T03:30:41.000Z,
            "updatedAt": "(id)",
          },
          {
            "bookmarkEntryId": "(id)",
            "createdAt": "(id)",
            "deckId": "(id)",
            "easeFactor": 8,
            "id": "(id)",
            "practiceActionsCount": 4,
            "queueType": "REVIEW",
            "scheduledAt": 2023-03-24T09:44:32.000Z,
            "updatedAt": "(id)",
          },
        ],
        "users": [
          {
            "createdAt": "(id)",
            "id": "(id)",
            "language1": null,
            "language2": null,
            "passwordHash": "(id)",
            "practiceActionsCount": 7,
            "timezone": "+00:00",
            "updatedAt": "(id)",
            "username": "username-models-with-dump",
          },
          {
            "createdAt": "(id)",
            "id": "(id)",
            "language1": null,
            "language2": null,
            "passwordHash": "(id)",
            "practiceActionsCount": 4,
            "timezone": "+00:00",
            "updatedAt": "(id)",
            "username": "username-models-with-dump",
          },
        ],
      }
    `);
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { importSeed } from "../../misc/seed-utils";
import { useUser } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { rpcRoutes } from "../server-v2";

describe(rpcRoutes.bookmarks_historyChart.name, () => {
  const user = useUser({
    seed: __filename,
  });

  beforeAll(async () => {
    await user.isReady;
    await importSeed(user.data.id);
  });

  it("basic", async () => {
    await mockRequestContext({ user: user.data })(async () => {
      const output = await rpcRoutes.bookmarks_historyChart({
        rangeType: "week",
        page: 3,
        __now: new Date("2023-04-11T12:00:00+09:00"),
      });
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "date": "2023-03-20",
            "total": 0,
          },
          {
            "date": "2023-03-21",
            "total": 29,
          },
          {
            "date": "2023-03-22",
            "total": 37,
          },
          {
            "date": "2023-03-23",
            "total": 15,
          },
          {
            "date": "2023-03-24",
            "total": 12,
          },
          {
            "date": "2023-03-25",
            "total": 0,
          },
          {
            "date": "2023-03-26",
            "total": 14,
          },
        ]
      `);
    });
  });
});

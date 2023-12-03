import { describe, expect, it } from "vitest";
import { E, T, selectMany } from "../../db/drizzle-client.server";
import { useUserVideo } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { rpcRoutes } from "../server";

describe(rpcRoutes.videos_destroy, () => {
  const hook = useUserVideo({
    seed: "videos_destroy",
  });

  function getVideos() {
    return selectMany(T.videos, E.eq(T.videos.id, hook.video.id));
  }

  it("basic", async () => {
    await mockRequestContext({ user: hook.user })(async () => {
      expect(await getVideos().then((v) => v.length)).toMatchInlineSnapshot(
        "1"
      );
      await rpcRoutes.videos_destroy({ videoId: hook.video.id });
      expect(await getVideos().then((v) => v.length)).toMatchInlineSnapshot(
        "0"
      );
    });
  });
});

import { describe, expect, it } from "vitest";
import { E, T, selectMany } from "../../db/drizzle-client.server";
import { useUserVideo } from "../../misc/test-helper";
import { trpc } from "../client";
import { testTrpcClient } from "../test-helper";

describe(trpc.videos_destroy.mutationKey, () => {
  const hook = useUserVideo({
    seed: __filename + "videos_destroy",
  });

  function getVideos() {
    return selectMany(T.videos, E.eq(T.videos.id, hook.video.id));
  }

  it("basic", async () => {
    await expect(getVideos()).resolves.toHaveLength(1);

    const trpc = await testTrpcClient({ user: hook.user });
    await trpc.videos_destroy({
      videoId: hook.video.id,
    });

    await expect(getVideos()).resolves.toHaveLength(0);
  });
});

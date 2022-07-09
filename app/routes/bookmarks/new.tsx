import { z } from "zod";
import { client } from "../../db/client.server";
import { Q } from "../../db/models";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { zStringToInteger } from "../../utils/zod-utils";

//
// action
//

const NEW_BOOKMARK_SCHEMA = z.object({
  videoId: zStringToInteger,
  captionEntryId: zStringToInteger,
  text: z.string().nonempty(),
  side: zStringToInteger.refine((x) => x === 0 || x === 1),
  offset: zStringToInteger,
});

export type NewBookmark = z.infer<typeof NEW_BOOKMARK_SCHEMA>;

// TODO: error handling
export const action = makeLoader(Controller, async function () {
  const parsed = NEW_BOOKMARK_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  if (!user) throw new AppError("Authenticaton failure");

  const { videoId, captionEntryId } = parsed.data;

  const video = await Q.videos()
    .where("userId", user.id)
    .where("id", videoId)
    .first();
  const captionEntry = await Q.captionEntries()
    .where("videoId", videoId)
    .where("id", captionEntryId)
    .first();
  if (!video || !captionEntry) throw new AppError("Resource not found");

  const id = await client.transaction(async (trx) => {
    const { videoId } = parsed.data;
    const [id] = await Q.bookmarkEntries()
      .transacting(trx)
      .insert({
        ...parsed.data,
        userId: user.id,
      });
    await Q.videos()
      .transacting(trx)
      .where("id", videoId)
      .increment("bookmarkEntriesCount");
    return id;
  });
  return { success: true, data: { id } };
});

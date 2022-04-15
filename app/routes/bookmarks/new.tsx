import { z } from "zod";
import { tables } from "../../db/models";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { zStringToInteger } from "../../utils/zod-utils";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  videoId: zStringToInteger,
  captionEntryId: zStringToInteger,
  text: z.string().nonempty(),
  side: zStringToInteger.refine((x) => x === 0 || x === 1),
  offset: zStringToInteger,
});

// TODO: error handling
export const action = makeLoader(Controller, async function () {
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  if (!user) throw new AppError("Authenticaton failure");

  const { videoId, captionEntryId } = parsed.data;

  const video = await tables
    .videos()
    .where("userId", user.id)
    .where("id", videoId)
    .first();
  const captionEntry = await tables
    .captionEntries()
    .where("videoId", videoId)
    .where("id", captionEntryId)
    .first();
  if (!video || !captionEntry) throw new AppError("Resource not found");

  const [id] = await tables
    .bookmarkEntries()
    .insert({ ...parsed.data, userId: user.id });
  return { success: true, data: { id } };
});

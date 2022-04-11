import { z } from "zod";
import { tables } from "../../db/models";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { zStringToNumber } from "../../utils/validation";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  videoId: zStringToNumber,
  captionEntryId: zStringToNumber,
  text: z.string().nonempty(),
});

// TODO: error handling
export const action = makeLoader(Controller, async function () {
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  if (!user) throw new AppError("Authenticaton failure");

  const { videoId, captionEntryId, text } = parsed.data;

  const video = tables
    .videos()
    .where("userId", user.id)
    .where("id", videoId)
    .first();
  const captionEntry = tables
    .captionEntries()
    .where("videoId", videoId)
    .where("id", captionEntryId)
    .first();
  if (!video || !captionEntry) throw new AppError("Resource not found");

  const [id] = await tables.bookmarkEntries().insert({ text, captionEntryId });
  return { success: true, data: { id } };
});

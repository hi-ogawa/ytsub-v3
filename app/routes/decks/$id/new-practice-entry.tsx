import { z } from "zod";
import { Q } from "../../../db/models";
import { assert } from "../../../misc/assert";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { isNonNullable } from "../../../utils/misc";
import { PracticeSystem } from "../../../utils/practice-system";
import { zStringToDate, zStringToInteger } from "../../../utils/zod-utils";
import { requireUserAndDeck } from ".";

//
// action
//

// TODO: support `bookmarkEntryId`
const ACTION_REQUEST_SCHEMA = z
  .object({
    videoId: zStringToInteger.optional(),
    bookmarkEntryId: zStringToInteger.optional(),
    now: zStringToDate,
  })
  .refine(
    (data) =>
      [data.videoId, data.bookmarkEntryId].filter(isNonNullable).length === 1
  );

export type NewPracticeEntryRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { success: false };
  }

  const { videoId, now } = parsed.data;
  assert(videoId);

  let bookmarkEntries = await Q.bookmarkEntries()
    .orWhere("bookmarkEntries.videoId", videoId)
    .leftJoin(
      "captionEntries",
      "captionEntries.id",
      "bookmarkEntries.captionEntryId"
    )
    .orderBy([
      {
        column: "captionEntries.index",
        order: "asc",
      },
      {
        column: "bookmarkEntries.offset",
        order: "asc",
      },
    ]);

  const system = new PracticeSystem(user, deck);
  const ids = Promise.all(
    bookmarkEntries.map((bookmarkEntry) =>
      system.createPracticeEntry(bookmarkEntry, now)
    )
  );
  return { success: true, data: { ids } };
});

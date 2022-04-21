import { z } from "zod";
import { Q } from "../../../db/models";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";
import { zStringToDate, zStringToInteger } from "../../../utils/zod-utils";
import { requireUserAndDeck } from ".";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  videoId: zStringToInteger,
  bookmarkEntryId: zStringToInteger,
  now: zStringToDate,
});

export type NewPracticeEntryRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { success: false };
  }

  const { bookmarkEntryId, now } = parsed.data;
  const bookmarkEntry = await Q.bookmarkEntries()
    .where({ id: bookmarkEntryId })
    .first();
  if (!bookmarkEntry) {
    return { success: false };
  }

  const system = new PracticeSystem(user, deck);
  const id = await system.createPracticeEntry(bookmarkEntry, now);
  return { success: true, data: { id } };
});

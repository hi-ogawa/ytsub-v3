import { z } from "zod";
import { PRACTICE_ACTION_TYPES, Q } from "../../../db/models";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";
import { zStringToDate, zStringToInteger } from "../../../utils/zod-utils";
import { requireUserAndDeck } from ".";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  practiceEntryId: zStringToInteger,
  actionType: z.enum(PRACTICE_ACTION_TYPES),
  now: zStringToDate,
});

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { success: false };
  }

  const { practiceEntryId, actionType, now } = parsed.data;
  const practiceEntry = await Q.practiceEntries()
    .where({ id: practiceEntryId })
    .first();
  if (!practiceEntry) {
    return { success: false };
  }

  const system = new PracticeSystem(user, deck);
  const id = await system.createPracticeAction(practiceEntry, actionType, now);
  return { success: true, data: { id } };
});

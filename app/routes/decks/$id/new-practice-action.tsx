import { requireUserAndDeck } from ".";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { PRACTICE_ACTION_TYPES, Q } from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";
import { zStringToDate, zStringToInteger } from "../../../utils/zod-utils";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  practiceEntryId: zStringToInteger,
  actionType: z.enum(PRACTICE_ACTION_TYPES),
  now: zStringToDate,
});

export type NewPracticeActionRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  assert(parsed.success);

  const { practiceEntryId, actionType, now } = parsed.data;
  const practiceEntry = await Q.practiceEntries()
    .where({ id: practiceEntryId })
    .first();
  assert(practiceEntry);

  const system = new PracticeSystem(user, deck);
  await system.createPracticeAction(practiceEntry, actionType, now);
  return redirect(R["/decks/$id/practice"](deck.id));
});

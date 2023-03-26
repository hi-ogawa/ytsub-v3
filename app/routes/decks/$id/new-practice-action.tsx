import { requireUserAndDeck } from ".";
import { tinyassert } from "@hiogawa/utils";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { PRACTICE_ACTION_TYPES, Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  practiceEntryId: z.coerce.number().int(),
  actionType: z.enum(PRACTICE_ACTION_TYPES),
  now: z.coerce.date(),
});

export type NewPracticeActionRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  tinyassert(parsed.success);

  const { practiceEntryId, actionType, now } = parsed.data;
  const practiceEntry = await Q.practiceEntries()
    .where({ id: practiceEntryId })
    .first();
  tinyassert(practiceEntry);

  const system = new PracticeSystem(user, deck);
  await system.createPracticeAction(practiceEntry, actionType, now);
  return redirect(R["/decks/$id/practice"](deck.id));
});

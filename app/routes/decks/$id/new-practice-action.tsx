import { requireUserAndDeck } from ".";
import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db, findOne } from "../../../db/drizzle-client.server";
import { Z_PRACTICE_ACTION_TYPES } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";

// TODO: move to /decks/new-practice-action.tsx ?

//
// action
//

const ACTION_REQUEST_SCHEMA = z.object({
  practiceEntryId: z.number().int(),
  actionType: Z_PRACTICE_ACTION_TYPES,
});

type NewPracticeActionRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export const action = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const { practiceEntryId, actionType } = ACTION_REQUEST_SCHEMA.parse(
    await this.request.json()
  );

  const practiceEntry = await findOne(
    db
      .select()
      .from(T.practiceEntries)
      .where(E.eq(T.practiceEntries.id, practiceEntryId))
  );
  tinyassert(practiceEntry);

  const system = new PracticeSystem(user, deck);
  await system.createPracticeAction(practiceEntry, actionType, new Date());
});

// client query
export function createNewPracticeActionMutation() {
  const url = R["/decks/$id/new-practice-action"];
  return {
    mutationKey: [String(url)],
    mutationFn: async (req: NewPracticeActionRequest & { deckId: number }) => {
      const res = await fetch(url(req.deckId), {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
    },
  };
}

import { requireUserAndDeck } from ".";
import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";

// TODO: move to /decks/new-practice-entry.tsx ?

//
// action
//

const Z_NEW_PRACTICE_ENTRY_REQUEST = z.object({
  videoId: z.number().int(),
});

type NewPracticeEntryRequest = z.infer<typeof Z_NEW_PRACTICE_ENTRY_REQUEST>;

type NewPracticeEntryResponse = {
  practiceEntryIds: number[];
};

export const action = makeLoader(Controller, actionImpl);

async function actionImpl(this: Controller): Promise<NewPracticeEntryResponse> {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const { videoId } = Z_NEW_PRACTICE_ENTRY_REQUEST.parse(
    await this.request.json()
  );

  const bookmarkEntries = await Q.bookmarkEntries()
    .select("bookmarkEntries.*")
    .where("bookmarkEntries.videoId", videoId)
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
  const practiceEntryIds = await system.createPracticeEntries(
    bookmarkEntries,
    new Date()
  );
  return { practiceEntryIds };
}

// client query
export function createNewPracticeEntryMutation() {
  const url = R["/decks/$id/new-practice-entry"];
  return {
    mutationKey: [String(url)],
    mutationFn: async (req: NewPracticeEntryRequest & { deckId: number }) => {
      const res = await fetch(url(req.deckId), {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
      const resJson = await res.json();
      return resJson as NewPracticeEntryResponse;
    },
  };
}

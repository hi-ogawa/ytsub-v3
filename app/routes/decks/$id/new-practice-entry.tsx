import { requireUserAndDeck } from ".";
import { Err, Ok, Result } from "@hiogawa/utils";
import { tinyassert } from "@hiogawa/utils";
import { isNil } from "@hiogawa/utils";
import { z } from "zod";
import { Q } from "../../../db/models";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { PracticeSystem } from "../../../utils/practice-system";
import { zStringToInteger } from "../../../utils/zod-utils";

//
// action
//

// TODO: support `bookmarkEntryId`
const ACTION_REQUEST_SCHEMA = z
  .object({
    videoId: zStringToInteger.optional(),
    bookmarkEntryId: zStringToInteger.optional(),
    now: z.coerce.date(),
  })
  .refine(
    (data) =>
      [data.videoId, data.bookmarkEntryId].filter((x) => !isNil(x)).length === 1
  );

export type NewPracticeEntryRequest = z.infer<typeof ACTION_REQUEST_SCHEMA>;

export type NewPracticeEntryResponse = Result<
  { ids: number[] },
  { message: string }
>;

export const action = makeLoader(Controller, actionImpl);

async function actionImpl(this: Controller): Promise<NewPracticeEntryResponse> {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const parsed = ACTION_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return Err({ message: "Invalid request" });
  }

  const { videoId, now } = parsed.data;
  tinyassert(videoId);

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
  const ids = await system.createPracticeEntries(bookmarkEntries, now);
  return Ok({ ids });
}

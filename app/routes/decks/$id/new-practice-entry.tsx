import { z } from "zod";
import { Q } from "../../../db/models";
import { assertOk } from "../../../misc/assert-ok";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { Result, isNotNil } from "../../../utils/misc";
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
    (data) => [data.videoId, data.bookmarkEntryId].filter(isNotNil).length === 1
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
    return { ok: false, data: { message: "Invalid request" } };
  }

  const { videoId, now } = parsed.data;
  assertOk(videoId);

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
  return { ok: true, data: { ids } };
}

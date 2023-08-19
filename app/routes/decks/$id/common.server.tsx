import type { DeckTable } from "../../../db/models";
import { requireUserAndDeck } from "../../../utils/loader-deck-utils";
import { makeLoader } from "../../../utils/loader-utils.server";

export interface LoaderData {
  deck: DeckTable;
}

export const loader = makeLoader(async ({ ctx }) => {
  const { deck } = await requireUserAndDeck(ctx);
  const loaderData: LoaderData = { deck };
  return loaderData;
});

import { json } from "@remix-run/server-runtime";
import { exportDeckJson } from "../../../misc/seed-utils";
import { requireUserAndDeck } from "../../../utils/loader-deck-utils";
import { makeLoader } from "../../../utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const { deck } = await requireUserAndDeck(ctx);
  const data = await exportDeckJson(deck.id);
  return json(data);
});

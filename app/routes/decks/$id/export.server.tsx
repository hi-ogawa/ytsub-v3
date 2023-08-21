import { json } from "@remix-run/server-runtime";
import { exportDeckJson } from "../../../misc/seed-utils";
import { wrapLoader } from "../../../utils/loader-utils.server";
import { ctx_requireUserAndDeck } from "./_utils.server";

export const loader = wrapLoader(async () => {
  const { deck } = await ctx_requireUserAndDeck();
  const data = await exportDeckJson(deck.id);
  return json(data);
});

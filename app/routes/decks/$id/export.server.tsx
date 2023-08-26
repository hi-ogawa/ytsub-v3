import { json } from "@remix-run/server-runtime";
import { exportDeckJson } from "../../../misc/seed-utils";
import { ctx_requireUserAndDeck } from "./_utils.server";

export const loader = async () => {
  const { deck } = await ctx_requireUserAndDeck();
  const data = await exportDeckJson(deck.id);
  return json(data);
};

import { requireUserAndDeck } from ".";
import { json } from "@remix-run/server-runtime";
import { exportDeckJson } from "../../../misc/seed-utils";
import { Controller, makeLoader } from "../../../utils/controller-utils";

//
// loader
//

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  const data = await exportDeckJson(deck.id);
  return json(data);
});

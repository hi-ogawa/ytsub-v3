import { json } from "@remix-run/server-runtime";
import { exportDeckJson } from "../../../misc/seed-utils";
import { requireUserAndDeckV2 } from "../../../utils/loader-deck-utils";
import { makeLoader } from "../../../utils/loader-utils";

export const loader = /* @__PURE__ */ makeLoader(async ({ ctx }) => {
  const { deck } = await requireUserAndDeckV2(ctx);
  const data = await exportDeckJson(deck.id);
  return json(data);
});

import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { T, TT, db } from "../../db/drizzle-client.server";
import { Controller, makeLoader } from "../../utils/controller-utils";

// it has to be separate from new.tsx since otherwise remix doesn't allow returning json,
// TODO: with this setup, probably we can do some auto client query generation + typing like trpc.

const Z_NEW_DECK_REQUEST = z.object({
  name: z.string().nonempty(),
  newEntriesPerDay: z.number().int(),
  reviewsPerDay: z.number().int(),
  easeMultiplier: z.number(),
  easeBonus: z.number(),
});

export type NewDeckRequest = z.infer<typeof Z_NEW_DECK_REQUEST>;

type NewDeckResponse = {
  deckId: number;
};

export const DEFAULT_DECK_OPTIONS: Pick<
  TT["decks"],
  "newEntriesPerDay" | "reviewsPerDay" | "easeMultiplier" | "easeBonus"
> = {
  newEntriesPerDay: 50,
  reviewsPerDay: 200,
  easeMultiplier: 2,
  easeBonus: 1.5,
};

export const action = makeLoader(Controller, async function () {
  const user = await this.requireUser();
  const payload = Z_NEW_DECK_REQUEST.parse(await this.request.json());
  const [{ insertId: deckId }] = await db.insert(T.decks).values({
    ...payload,
    userId: user.id,
  });
  const res: NewDeckResponse = { deckId };
  return res;
});

// client query
export function createNewDeckMutation() {
  const url = "/decks/new-api";
  return {
    mutationKey: [url],
    mutationFn: async (req: NewDeckRequest) => {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
      return (await res.json()) as NewDeckResponse;
    },
  };
}

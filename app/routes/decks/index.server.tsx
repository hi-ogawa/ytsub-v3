import { E, T, db } from "../../db/drizzle-client.server";
import type { DeckTable } from "../../db/models";
import { makeLoader } from "../../utils/loader-utils.server";

export interface DecksLoaderData {
  decks: DeckTable[];
}

export const loader = makeLoader(async ({ ctx }) => {
  const user = await ctx.requireUser();
  const decks = await db
    .select()
    .from(T.decks)
    .where(E.eq(T.decks.userId, user.id))
    .orderBy(E.desc(T.decks.createdAt));
  const loaderData: DecksLoaderData = { decks };
  return loaderData;
});

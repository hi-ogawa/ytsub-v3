import { E, T, db } from "#db/drizzle-client.server";
import type { DeckTable } from "#db/models";
import {
  ctx_requireUserOrRedirect,
  wrapLoader,
} from "#utils/loader-utils.server";

export interface DecksLoaderData {
  decks: DeckTable[];
}

export const loader = wrapLoader(async () => {
  const user = await ctx_requireUserOrRedirect();
  const decks = await db
    .select()
    .from(T.decks)
    .where(E.eq(T.decks.userId, user.id))
    .orderBy(E.desc(T.decks.createdAt));
  const loaderData: DecksLoaderData = { decks };
  return loaderData;
});

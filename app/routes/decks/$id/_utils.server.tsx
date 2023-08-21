import { E, T, db, limitOne } from "../../../db/drizzle-client.server";
import type { DeckTable } from "../../../db/models";
import { ROUTE_DEF } from "../../../misc/routes";
import { ctx_get } from "../../../server/request-context/storage";
import {
  assertOrRespond,
  ctx_requireUserOrRedirect,
  wrapLoader,
} from "../../../utils/loader-utils.server";

export interface LoaderData {
  deck: DeckTable;
}

export const loader = wrapLoader(async () => {
  const { deck } = await ctx_requireUserAndDeck();
  const loaderData: LoaderData = { deck };
  return loaderData;
});

export async function ctx_requireUserAndDeck() {
  const user = await ctx_requireUserOrRedirect();
  const params = ROUTE_DEF["/decks/$id"].params.parse(ctx_get().params);
  const found = await limitOne(
    db
      .select()
      .from(T.users)
      .innerJoin(T.decks, E.eq(T.decks.userId, T.users.id))
      .where(E.and(E.eq(T.users.id, user.id), E.eq(T.decks.id, params.id)))
  );
  assertOrRespond(found);
  return {
    user: found.users,
    deck: found.decks,
  };
}

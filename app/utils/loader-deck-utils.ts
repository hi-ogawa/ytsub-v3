import { tinyassert } from "@hiogawa/utils";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import { ROUTE_DEF } from "../misc/routes";
import type { LoaderContext } from "./loader-utils.server";

export async function requireUserAndDeckV2(ctx: LoaderContext) {
  const user = await ctx.requireUser();
  const params = ROUTE_DEF["/decks/$id"].params.parse(ctx.params);
  const found = await findOne(
    db
      .select()
      .from(T.users)
      .innerJoin(T.decks, E.eq(T.decks.userId, T.users.id))
      .where(E.and(E.eq(T.users.id, user.id), E.eq(T.decks.id, params.id)))
  );
  tinyassert(found);
  return {
    user: found.users,
    deck: found.decks,
  };
}

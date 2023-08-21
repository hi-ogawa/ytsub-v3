import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type { DeckTable, PracticeEntryTable } from "../../../db/models";
import { ROUTE_DEF } from "../../../misc/routes";
import { ctx_get } from "../../../server/request-context/storage";
import { wrapLoader } from "../../../utils/loader-utils.server";
import type { PaginationMetadata } from "../../../utils/pagination";
import { ctx_requireUserAndDeck } from "./_utils.server";

export type PracticeEntryTableExtra = PracticeEntryTable & {
  practiceActionsCount: number;
};

export interface LoaderData {
  deck: DeckTable;
  pagination: PaginationMetadata;
  rows: Pick<
    TT,
    "practiceEntries" | "bookmarkEntries" | "captionEntries" | "videos"
  >[];
}

export const loader = wrapLoader(async () => {
  const { deck } = await ctx_requireUserAndDeck();
  const reqQuery = ROUTE_DEF["/decks/$id"].query.parse(ctx_get().urlQuery);

  const baseQuery = db
    .select()
    .from(T.practiceEntries)
    .innerJoin(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
    )
    .innerJoin(
      T.captionEntries,
      E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
    )
    .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
    .where(E.eq(T.practiceEntries.deckId, deck.id))
    .orderBy(E.asc(T.practiceEntries.createdAt));

  const [rows, pagination] = await toPaginationResult(baseQuery, reqQuery);

  const loaderData: LoaderData = {
    deck,
    pagination,
    rows,
  };
  return loaderData;
});

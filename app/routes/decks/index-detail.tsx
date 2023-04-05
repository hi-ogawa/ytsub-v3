import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, TT, db } from "../../db/drizzle-client.server";
import { R } from "../../misc/routes";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";

//
// action
//

const Z_DECKS_INDEX_DETAIL_REQUEST = z.object({
  videoId: z.number().int(),
});

export type DecksIndexDetailRequest = z.infer<
  typeof Z_DECKS_INDEX_DETAIL_REQUEST
>;

export interface DecksIndexDetailResponse {
  decks: TT["decks"][];
  counts: {
    deckId: number;
    count: number;
  }[];
}

export const action = makeLoader(Controller, async function () {
  tinyassert(this.request.method === "POST");

  const user = await this.requireUser();
  tinyassert(user);

  const { videoId } = Z_DECKS_INDEX_DETAIL_REQUEST.parse(
    await this.request.json()
  );

  const rows = await db
    .select({ deckId: T.decks.id, count: sql<number>`COUNT(0)` })
    .from(T.practiceEntries)
    .innerJoin(T.decks, E.eq(T.decks.id, T.practiceEntries.deckId))
    .innerJoin(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
    )
    .where(
      E.and(
        E.eq(T.bookmarkEntries.videoId, videoId),
        E.eq(T.decks.userId, user.id)
      )
    )
    .groupBy(T.decks.id);

  const decks = await db
    .select()
    .from(T.decks)
    .where(E.eq(T.decks.userId, user.id))
    .orderBy(E.desc(T.decks.createdAt));

  const loaderData: DecksIndexDetailResponse = { decks, counts: rows };
  return this.serialize(loaderData);
});

export async function fetchDecksIndexDetail(
  req: DecksIndexDetailRequest
): Promise<DecksIndexDetailResponse> {
  const res = await fetch(R["/decks/index-detail"], {
    method: "POST",
    body: JSON.stringify(req),
  });
  tinyassert(res.ok);
  return deserialize(await res.json());
}

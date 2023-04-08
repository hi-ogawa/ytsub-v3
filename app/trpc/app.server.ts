import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import { middlewares } from "./context.server";
import { routerFactory } from "./factory.server";
import { procedureBuilder } from "./factory.server";

// TODO: figure out file organization (put all routes here for now)

export const trpcApp = routerFactory({
  bookmarks_create: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
        captionEntryId: z.number().int(),
        text: z.string().nonempty(),
        side: z.union([z.literal(0), z.literal(1)]),
        offset: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const found = await findOne(
        db
          .select()
          .from(T.captionEntries)
          .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
          .where(
            E.and(
              E.eq(T.captionEntries.id, input.captionEntryId),
              E.eq(T.videos.id, input.videoId),
              E.eq(T.videos.userId, ctx.user.id)
            )
          )
      );
      tinyassert(found, "not found");

      // insert with counter cache increment
      await db.insert(T.bookmarkEntries).values({
        ...input,
        userId: ctx.user.id,
      });
      await db
        .update(T.videos)
        .set({
          bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1`,
        })
        .where(E.eq(T.videos.id, input.videoId));
    }),

  decks_practiceEntriesCount: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .query(async ({ input, ctx }) => {
      const rows = await db
        .select({
          deckId: T.decks.id,
          practiceEntriesCount: sql<number>`COUNT(0)`,
        })
        .from(T.practiceEntries)
        .innerJoin(T.decks, E.eq(T.decks.id, T.practiceEntries.deckId))
        .innerJoin(
          T.bookmarkEntries,
          E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
        )
        .where(
          E.and(
            E.eq(T.decks.userId, ctx.user.id),
            E.eq(T.bookmarkEntries.videoId, input.videoId)
          )
        )
        .groupBy(T.decks.id);

      const decks = await db
        .select()
        .from(T.decks)
        .where(E.eq(T.decks.userId, ctx.user.id))
        .orderBy(E.desc(T.decks.createdAt));

      const results = decks.map((deck) => ({
        deck,
        practiceEntriesCount:
          rows.find((row) => row.deckId === deck.id)?.practiceEntriesCount ?? 0,
      }));

      return results;
    }),
});

import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { Z_PRACTICE_ACTION_TYPES } from "../../db/types";
import { importDeckJson } from "../../misc/seed-utils";
import { PracticeSystem } from "../../utils/practice-system";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesDecks = {
  decks_practiceEntriesCreate: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        videoId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const rows = await db
        .select()
        .from(T.bookmarkEntries)
        .innerJoin(
          T.captionEntries,
          E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
        )
        .where(E.eq(T.bookmarkEntries.videoId, input.videoId))
        .orderBy(
          E.asc(T.captionEntries.index),
          E.asc(T.bookmarkEntries.offset)
        );
      const bookmarkEntries = rows.map((row) => row.bookmarkEntries);

      const system = new PracticeSystem(ctx.user, deck);
      const practiceEntryIds = await system.createPracticeEntries(
        bookmarkEntries,
        new Date()
      );
      return { practiceEntryIds };
    }),

  decks_practiceActionsCreate: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        practiceEntryId: z.number().int(),
        actionType: Z_PRACTICE_ACTION_TYPES,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const practiceEntry = await findOne(
        db
          .select()
          .from(T.practiceEntries)
          .where(E.eq(T.practiceEntries.id, input.practiceEntryId))
      );
      tinyassert(practiceEntry);

      const system = new PracticeSystem(ctx.user, deck);
      await system.createPracticeAction(
        practiceEntry,
        input.actionType,
        new Date()
      );
    }),

  decks_create: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        name: z.string().nonempty(),
        newEntriesPerDay: z.number().int(),
        reviewsPerDay: z.number().int(),
        easeMultiplier: z.number(),
        easeBonus: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [{ insertId: deckId }] = await db.insert(T.decks).values({
        ...input,
        userId: ctx.user.id,
      });
      return { deckId };
    }),

  decks_update: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().nonempty(),
        newEntriesPerDay: z.number().int(),
        reviewsPerDay: z.number().int(),
        randomMode: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await db
        .update(T.decks)
        .set(rest)
        .where(E.and(E.eq(T.decks.id, id), E.eq(T.decks.userId, ctx.user.id)));
    }),

  decks_destroy: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        id: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.id,
        userId: ctx.user.id,
      });
      tinyassert(deck);
      await db
        .delete(T.decks)
        .where(
          E.and(E.eq(T.decks.id, input.id), E.eq(T.decks.userId, ctx.user.id))
        );
    }),

  decks_import: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        data: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await importDeckJson(ctx.user.id, JSON.parse(input.data));
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
};

//
// utils
//

function findUserDeck({ deckId, userId }: { deckId: number; userId: number }) {
  return findOne(
    db
      .select()
      .from(T.decks)
      .where(E.and(E.eq(T.decks.id, deckId), E.eq(T.decks.userId, userId)))
  );
}

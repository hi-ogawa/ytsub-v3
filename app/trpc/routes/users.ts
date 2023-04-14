import { sql } from "drizzle-orm";
import { z } from "zod";
import { T, db } from "../../db/drizzle-client.server";
import { isValidTimezone } from "../../utils/temporal-utils";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesUsers = {
  users_update: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        language1: z.string().nullable(),
        language2: z.string().nullable(),
        timezone: z.string().refine(isValidTimezone),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db
        .update(T.users)
        .set(input)
        .where(sql`${T.users.id} = ${ctx.user.id}`);
    }),
};

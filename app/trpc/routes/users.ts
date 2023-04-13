import { sql } from "drizzle-orm";
import { z } from "zod";
import { T, db } from "../../db/drizzle-client.server";
import { TIMEZONE_RE } from "../../utils/timezone";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesUsers = {
  users_update: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        language1: z.string().nullable(),
        language2: z.string().nullable(),
        timezone: z.string().regex(TIMEZONE_RE),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db
        .update(T.users)
        .set(input)
        .where(sql`${T.users.id} = ${ctx.user.id}`);
    }),
};

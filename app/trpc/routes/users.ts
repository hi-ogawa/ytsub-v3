import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db } from "../../db/drizzle-client.server";
import {
  findByUsername,
  signinSession,
  signoutSession,
  verifyPassword,
} from "../../utils/auth";
import { isValidTimezone } from "../../utils/temporal-utils";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesUsers = {
  users_signin: procedureBuilder
    .use(middlewares.currentUser)
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      tinyassert(!ctx.user, "Already signed in");
      const user = await findByUsername(input.username);
      if (user && (await verifyPassword(input.password, user.passwordHash))) {
        signinSession(ctx.session, user);
        await ctx.commitSession();
        return user;
      }
      throw new Error("Invalid username or password");
    }),

  users_signout: procedureBuilder
    .use(middlewares.currentUser)
    .mutation(async ({ ctx }) => {
      signoutSession(ctx.session);
      await ctx.commitSession();
    }),

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
      await db.update(T.users).set(input).where(E.eq(T.users.id, ctx.user.id));
    }),
};

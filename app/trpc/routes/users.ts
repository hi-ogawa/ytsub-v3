import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db } from "../../db/drizzle-client.server";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  findByUsername,
  register,
  signinSession,
  signoutSession,
  verifyPassword,
} from "../../utils/auth";
import { isValidTimezone } from "../../utils/temporal-utils";
import { verifyTurnstile } from "../../utils/turnstile-utils.server";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesUsers = {
  users_register: procedureBuilder
    .use(middlewares.currentUser)
    .input(
      z
        .object({
          username: z
            .string()
            .nonempty()
            .max(USERNAME_MAX_LENGTH)
            .regex(/^[a-zA-Z0-9_.-]+$/),
          password: z.string().nonempty().max(PASSWORD_MAX_LENGTH),
          passwordConfirmation: z.string(),
          token: z.string(),
          timezone: z.string().refine(isValidTimezone),
        })
        .refine((obj) => obj.password === obj.passwordConfirmation, {
          message: "Invalid",
          path: ["passwordConfirmation"],
        })
    )
    .mutation(async ({ input, ctx }) => {
      tinyassert(!ctx.user, "Already signed in");
      await verifyTurnstile({ response: input.token });
      const user = await register(input);
      signinSession(ctx.session, user);
      await ctx.commitSession();
    }),

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
    .input(z.null())
    .mutation(async ({ ctx }) => {
      tinyassert(ctx.user, "Not signed in");
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

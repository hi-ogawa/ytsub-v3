import crypto from "node:crypto";
import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db } from "../../db/drizzle-client.server";
import { $R } from "../../misc/routes";
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

  users_requestUpdateEmail: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      tinyassert(input.email !== ctx.user.email);
      const code = crypto.randomBytes(32).toString("hex"); // 64 chars
      await db.insert(T.userVerifications).values({
        userId: ctx.user.id,
        email: input.email,
        code,
      });
      // TODO: send email with link
      // TODO: escape hatch for e2e
      const href = $R["/users/verify"](null, { code });
      console.log({ href });
    }),

  // TODO
  users_requestResetPassword: procedureBuilder
    .input(
      z.object({
        email: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      input;
    }),

  // TODO
  users_resetPassword: procedureBuilder
    .input(
      z.object({
        code: z.string(),
        password: z.string(),
        passwordConfirmation: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      tinyassert(input.password === input.passwordConfirmation);
    }),
};

// not exposed as trpc since it's done directly in /users/verify loader
export async function updateEmailByCode(code: string) {
  // select one
  const rows = await db
    .select()
    .from(T.userVerifications)
    .where(E.eq(T.userVerifications.code, code))
    .orderBy(E.desc(T.userVerifications.createdAt))
    .limit(1);
  const row = rows.at(0);
  tinyassert(row);
  tinyassert(!row.verifiedAt);

  // update user
  await db
    .update(T.users)
    .set({
      email: row.email,
    })
    .where(E.eq(T.users.id, row.userId));

  // update verification
  await db
    .update(T.userVerifications)
    .set({
      verifiedAt: new Date(),
    })
    .where(E.eq(T.userVerifications.id, row.id));
}

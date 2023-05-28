import crypto from "crypto";
import { tinyassert } from "@hiogawa/utils";
import showdown from "showdown";
import { z } from "zod";
import { E, T, db, selectOne } from "../../db/drizzle-client.server";
import { $R } from "../../misc/routes";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  findByUsername,
  register,
  signinSession,
  signoutSession,
  toPasswordHash,
  verifySignin,
} from "../../utils/auth";
import { serverConfig } from "../../utils/config";
import { sendEmail } from "../../utils/email-utils";
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
      await verifySignin(input);
      const user = await findByUsername(input.username);
      tinyassert(user);
      signinSession(ctx.session, user);
      await ctx.commitSession();
      return user;
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
      // we only minimally check if new email is differrnt from current email.
      // we don't check whether new email already exists in db
      // because showing an error for that would give away other user's email.
      tinyassert(input.email !== ctx.user.email);
      const code = await generateUniqueCode((code) =>
        selectOne(
          T.emailUpdateRequests,
          E.eq(T.emailUpdateRequests.code, code)
        ).then((row) => !row)
      );
      await db.insert(T.emailUpdateRequests).values({
        userId: ctx.user.id,
        email: input.email,
        code,
      });
      await sendEmailChangeVerificationEmail({
        username: ctx.user.username,
        email: input.email,
        code,
      });
    }),

  users_requestResetPassword: procedureBuilder
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await verifyTurnstile({ response: input.token });

      const code = await generateUniqueCode((code) =>
        selectOne(
          T.passwordResetRequests,
          E.eq(T.passwordResetRequests.code, code)
        ).then((row) => !row)
      );
      await db.insert(T.passwordResetRequests).values({
        email: input.email,
        code,
      });

      const user = await selectOne(T.users, E.eq(T.users.email, input.email));
      // TODO: obfuscate response time
      if (user) {
        await sendResetPasswordEmail({ email: input.email, code });
      }
    }),

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

      const row = await selectOne(
        T.passwordResetRequests,
        E.eq(T.passwordResetRequests.code, input.code)
      );
      tinyassert(row);
      tinyassert(!row.invalidatedAt);

      const now = new Date();
      tinyassert(
        now.getTime() - row.createdAt.getTime() < VERIFICATION_MAX_AGE
      );

      // find and update user
      const user = await selectOne(T.users, E.eq(T.users.email, row.email));
      tinyassert(user);
      await db
        .update(T.usersCredentials)
        .set({
          passwordHash: await toPasswordHash(input.password),
        })
        .where(E.eq(T.users.id, user.id));

      // invalidate request
      await db
        .update(T.passwordResetRequests)
        .set({
          invalidatedAt: now,
        })
        .where(E.eq(T.passwordResetRequests.id, row.id));

      // TODO: send email to notify password has changed
      // TODO: reset existing sessions
    }),
};

// check collision in application layer first
async function generateUniqueCode(
  checkUnique: (v: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; ; i++) {
    if (i > 100) {
      throw new Error("bound loop just in case");
    }
    const value = crypto.randomBytes(32).toString("hex"); // 64 chars
    if (await checkUnique(value)) {
      return value;
    }
  }
}

// not exposed as trpc since it's done directly in /users/verify loader
export async function updateEmailByCode(code: string) {
  const row = await selectOne(
    T.emailUpdateRequests,
    E.eq(T.emailUpdateRequests.code, code)
  );
  tinyassert(row);
  tinyassert(!row.verifiedAt);

  const now = new Date();
  tinyassert(now.getTime() - row.createdAt.getTime() < VERIFICATION_MAX_AGE);

  // update user
  await db
    .update(T.users)
    .set({
      email: row.email,
    })
    .where(E.eq(T.users.id, row.userId));

  // update verification
  await db
    .update(T.emailUpdateRequests)
    .set({
      verifiedAt: now,
    })
    .where(E.eq(T.emailUpdateRequests.id, row.id));

  // TODO: send email to notify email has changed
  // TODO: reset existing sessions
}

const VERIFICATION_MAX_AGE = 1000 * 60 * 60;

//
// email (based on https://github.com/ActiveCampaign/postmark-templates)
//

async function sendEmailChangeVerificationEmail({
  username,
  email,
  code,
}: {
  username: string;
  email: string;
  code: string;
}) {
  const href = serverConfig.BASE_URL + $R["/users/verify"](null, { code });
  const TextPart = `\
Hi, ${username}

You recently requested to change your email on Ytsub account.
Please follow this link to confirm the change:

[Change your email](${href})

If you did not request an email change, please ignore this email.
`;
  await sendEmail({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        From: EMAIL_FROM,
        Subject: "Email change verification",
        TextPart,
        HTMLPart: new showdown.Converter().makeHtml(TextPart),
      },
    ],
  });
}

async function sendResetPasswordEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const href =
    serverConfig.BASE_URL + $R["/users/password-new"](null, { code });
  const TextPart = `\
Hello,

You recently requested to reset your password on Ytsub account.
Please follow this link to continue:

[Reset your password](${href})

If you did not request a password reset, please ignore this email.
`;
  await sendEmail({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        From: EMAIL_FROM,
        Subject: "Password reset",
        TextPart,
        HTMLPart: new showdown.Converter().makeHtml(TextPart),
      },
    ],
  });
}

const EMAIL_FROM = {
  Name: "Ytsub",
  Email: "noreply@hiro18181.com",
};

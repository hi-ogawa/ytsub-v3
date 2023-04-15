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
import { publicConfig, serverConfig } from "../../utils/config";
import { isValidTimezone } from "../../utils/temporal-utils";
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
          recaptchaToken: z.string(),
          timezone: z.string().refine(isValidTimezone),
        })
        .refine((obj) => obj.password === obj.passwordConfirmation, {
          message: "Invalid",
          path: ["passwordConfirmation"],
        })
    )
    .mutation(async ({ input, ctx }) => {
      tinyassert(!ctx.user, "Already signed in");

      if (!publicConfig.APP_RECAPTCHA_DISABLED) {
        tinyassert(
          await verifyRecaptchaToken(input.recaptchaToken),
          "Invalid reCAPTCHA"
        );
      }

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

//
// recaptcha utils
//

async function verifyRecaptchaToken(token: string): Promise<boolean> {
  // https://developers.google.com/recaptcha/docs/verify
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    body: toFormDate({
      secret: serverConfig.APP_RECAPTCHA_SERVER_KEY,
      response: token,
    }),
  });
  tinyassert(res.ok);

  const resJson = await res.json();
  const parsed = Z_RECAPTCHA_REPONSE.parse(resJson);
  return parsed.success && parsed.score >= 0.5;
}

function toFormDate(data: object) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(data)) {
    formData.set(k, String(v));
  }
  return formData;
}

// https://developers.google.com/recaptcha/docs/v3#site_verify_response
const Z_RECAPTCHA_REPONSE = z.object({
  success: z.boolean(),
  score: z.number(),
});

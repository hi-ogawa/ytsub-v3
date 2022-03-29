import * as React from "react";
import { Form, Link } from "@remix-run/react";
import { ActionFunction } from "@remix-run/server-runtime";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { useIsFormValid } from "../../utils/hooks";
import { fromRequestForm } from "../../utils/url-data";
import { users } from "../../db/models";
import { crypto } from "../../node.server";

const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MAX_LENGTH = 128;
const BCRYPT_ROUNDS = 10;

const schema = z
  .object({
    username: z
      .string()
      .nonempty()
      .max(USERNAME_MAX_LENGTH)
      .regex(/^[a-zA-Z0-9_.-]+$/),
    password: z.string().nonempty().max(PASSWORD_MAX_LENGTH),
    passwordConfirmation: z.string().nonempty().max(PASSWORD_MAX_LENGTH),
  })
  .refine((obj) => obj.password === obj.passwordConfirmation);

function prehash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest()
    .toString("base64");
}

async function toPasswordHash(password: string): Promise<string> {
  return await bcrypt.hash(prehash(password), BCRYPT_ROUNDS);
}

// @ts-expect-error unused
async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(prehash(password), passwordHash);
}

export const action: ActionFunction = async ({ request }) => {
  const parsed = schema.safeParse(await fromRequestForm(request));
  if (!parsed.success) {
    return { message: "Invalid registration" };
  }

  // Verify uniqueness
  const { data } = parsed;
  if (await users().select().where("username", data.username).first()) {
    return { message: `Username '${data.username}' is already taken` };
  }

  // Save
  const passwordHash = await toPasswordHash(data.password);
  const [userId] = await users().insert({
    username: data.username,
    passwordHash,
  });

  // TODO: login
  return { userId };
};

export default function DefaultComponent() {
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form method="post" className="card border w-80 p-4 px-6" {...formProps}>
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            name="username"
            className="input input-bordered"
            required
            maxLength={USERNAME_MAX_LENGTH}
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            name="password"
            className="input input-bordered"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password confirmation</span>
          </label>
          <input
            type="password"
            name="passwordConfirmation"
            className="input input-bordered"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Register
          </button>
          <label className="label">
            <div className="label-text text-xs text-gray-400">
              Already have an account?{" "}
              <Link to="/users/signin" className="link link-primary">
                Sign in
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

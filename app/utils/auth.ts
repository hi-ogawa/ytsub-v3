import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { crypto } from "../node.server";
import { UserTable, users } from "../db/models";
import { AppError } from "./errors";

export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MAX_LENGTH = 128;

export const REGISTER_SCHEMA = z
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

const BCRYPT_ROUNDS = 10;

function prehash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest()
    .toString("base64");
}

export async function toPasswordHash(password: string): Promise<string> {
  return await bcrypt.hash(prehash(password), BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(prehash(password), passwordHash);
}

export async function register(data: {
  username: string;
  password: string;
}): Promise<UserTable> {
  // Check uniqueness
  if (await users().select().where("username", data.username).first()) {
    throw new AppError(`Username '${data.username}' is already taken`);
  }

  // Save
  const passwordHash = await toPasswordHash(data.password);
  const [user] = await users()
    .insert({
      username: data.username,
      passwordHash,
    })
    .returning("*");
  return user;
}

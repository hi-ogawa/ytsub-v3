import { Session } from "@remix-run/server-runtime";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { Q, UserTable } from "../db/models";
import { AppError } from "./errors";
import { crypto } from "./node.server";
import { commitSession, getSession } from "./session.server";

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
  .refine((obj) => obj.password === obj.passwordConfirmation, {
    message: "Invalid",
    path: ["passwordConfirmation"],
  });

export const SIGNIN_SCHEMA = z.object({
  username: z
    .string()
    .nonempty()
    .max(USERNAME_MAX_LENGTH)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().nonempty().max(PASSWORD_MAX_LENGTH),
});

const BCRYPT_ROUNDS = 10;

export function sha256(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest()
    .toString("base64");
}

export async function toPasswordHash(password: string): Promise<string> {
  return await bcrypt.hash(sha256(password), BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(sha256(password), passwordHash);
}

export async function register(data: {
  username: string;
  password: string;
}): Promise<UserTable> {
  // Check uniqueness
  if (await Q.users().select().where("username", data.username).first()) {
    throw new AppError(`Username '${data.username}' is already taken`);
  }

  // Save
  const passwordHash = await toPasswordHash(data.password);
  const [id] = await Q.users().insert({
    username: data.username,
    passwordHash,
  });
  const user = await Q.users().where("id", id).first();
  if (!user) {
    throw new AppError("Unknown registration error");
  }
  return user;
}

export async function verifySignin(data: {
  username: string;
  password: string;
}): Promise<UserTable> {
  // Find user
  const user = await Q.users()
    .select()
    .where("username", data.username)
    .first();
  if (user && (await verifyPassword(data.password, user.passwordHash))) {
    return user;
  }
  throw new AppError("Invalid username or password");
}

const SESSION_USER_KEY = "session-user-v1";

export function signinSession(session: Session, user: UserTable): void {
  session.set(SESSION_USER_KEY, user.id);
}

export function signoutSession(session: Session): void {
  session.unset(SESSION_USER_KEY);
}

export function getSessionUserId(session: Session): number | undefined {
  const id = session.get(SESSION_USER_KEY);
  if (id === undefined) return;
  return id;
}

export async function getSessionUser(
  session: Session
): Promise<UserTable | undefined> {
  const id = getSessionUserId(session);
  if (id === undefined) return;
  return await Q.users().where("id", id).first();
}

export async function createUserCookie(user: UserTable) {
  const session = await getSession();
  signinSession(session, user);
  const cookie = await commitSession(session);
  return cookie;
}

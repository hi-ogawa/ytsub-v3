import { isNil, tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import type { UserTable } from "../db/models";
import { AppError } from "./errors";
import { crypto } from "./node.server";
import { commitSession, getSession } from "./session.server";
import { DEFAULT_TIMEZONE, TIMEZONE_RE } from "./timezone";

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
    recaptchaToken: z.string(),
    timezone: z.string().regex(TIMEZONE_RE).default(DEFAULT_TIMEZONE),
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

export function sha256(
  password: string,
  encoding: "base64" | "hex" = "base64"
): string {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest()
    .toString(encoding);
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

export async function register({
  username,
  password,
  timezone = DEFAULT_TIMEZONE,
}: {
  username: string;
  password: string;
  timezone?: string;
}): Promise<UserTable> {
  // Check uniqueness
  if (await findByUsername(username)) {
    throw new AppError(`Username '${username}' is already taken`);
  }

  // Save
  const passwordHash = await toPasswordHash(password);
  await db.insert(T.users).values({
    username,
    passwordHash,
    timezone,
  });

  const user = await findByUsername(username);
  tinyassert(user);
  return user;
}

export async function findByUsername(
  username: string
): Promise<UserTable | undefined> {
  return findOne(
    db.select().from(T.users).where(E.eq(T.users.username, username))
  );
}

export async function verifySignin(data: {
  username: string;
  password: string;
}): Promise<UserTable> {
  // Find user
  const user = await findByUsername(data.username);
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
  const id: unknown = session.get(SESSION_USER_KEY);
  return typeof id === "number" ? id : undefined;
}

export async function getSessionUser(
  session: Session
): Promise<UserTable | undefined> {
  const id = getSessionUserId(session);
  if (!isNil(id)) {
    return findOne(db.select().from(T.users).where(E.eq(T.users.id, id)));
  }
  return;
}

export async function createUserCookie(user: UserTable) {
  const session = await getSession();
  signinSession(session, user);
  const cookie = await commitSession(session);
  return cookie;
}

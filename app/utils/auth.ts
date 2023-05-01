import { isNil, tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import bcrypt from "bcryptjs";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import type { UserTable } from "../db/models";
import { AppError } from "./errors";
import { crypto } from "./node.server";
import { sessionStore } from "./session.server";

export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MAX_LENGTH = 128;
const DEFAULT_TIMEZONE = "+00:00";
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

export function signinSession(
  session: Session,
  user: Pick<UserTable, "id">
): void {
  session.set(SESSION_USER_KEY, user.id);
}

export function signoutSession(session: Session): void {
  session.unset(SESSION_USER_KEY);
}

function getSessionUserId(session: Session): number | undefined {
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

// TODO: should be sync for cookie storage?
export async function createUserCookie(user: Pick<UserTable, "id">) {
  const session = await sessionStore.getSession();
  signinSession(session, user);
  const cookie = await sessionStore.commitSession(session);
  return cookie;
}

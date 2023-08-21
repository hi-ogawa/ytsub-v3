import { isNil, tinyassert } from "@hiogawa/utils";
import type { Session } from "@remix-run/server-runtime";
import { E, T, db, selectOne } from "../db/drizzle-client.server";
import type { UserTable } from "../db/models";
import {
  toPasswordHash,
  verifyPassword,
  verifyPasswordNoop,
} from "./password-utils";
import { sessionStore } from "./session.server";

const DEFAULT_TIMEZONE = "+00:00";

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
    throw new Error(`Username '${username}' is already taken`);
  }

  // Save
  const passwordHash = await toPasswordHash(password);
  const [{ insertId }] = await db.insert(T.usersCredentials).values({
    username,
    passwordHash,
  });
  await db.update(T.users).set({ timezone }).where(E.eq(T.users.id, insertId));

  const user = await findByUsername(username);
  tinyassert(user);
  return user;
}

export async function findByUsername(
  username: string
): Promise<UserTable | undefined> {
  return selectOne(T.users, E.eq(T.users.username, username));
}

export async function verifySignin(data: {
  username: string;
  password: string;
}): Promise<boolean> {
  const user = await selectOne(
    T.usersCredentials,
    E.eq(T.users.username, data.username)
  );
  if (!user) {
    await verifyPasswordNoop();
    return false;
  }
  return await verifyPassword(data.password, user.passwordHash);
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
    return selectOne(T.users, E.eq(T.users.id, id));
  }
  return;
}

export function findUserById(id: number) {
  return selectOne(T.users, E.eq(T.users.id, id));
}

// for testing and dev cli
// TODO: should be sync for cookie storage?
export async function createUserCookie(user: Pick<UserTable, "id">) {
  const session = await sessionStore.getSession();
  signinSession(session, user);
  const cookie = await sessionStore.commitSession(session);
  return cookie;
}

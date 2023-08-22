import { tinyassert } from "@hiogawa/utils";
import { E, T, db, selectOne } from "../db/drizzle-client.server";
import type { UserTable } from "../db/models";
import {
  toPasswordHash,
  verifyPassword,
  verifyPasswordNoop,
} from "./password-utils";

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

export function findUserById(id: number) {
  return selectOne(T.users, E.eq(T.users.id, id));
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

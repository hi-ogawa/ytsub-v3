import { hashString } from "@hiogawa/utils";
import { E, T, db } from "../db/drizzle-client.server";
import type { UserTable } from "../db/models";
import { register } from "../utils/auth";

export function useUserImpl({
  username = "root",
  password = "pass",
  seed,
}: {
  username?: string;
  password?: string;
  seed?: string;
}) {
  // generate pseudo random username to avoid db uniqueness constraint
  if (seed !== undefined) {
    username += "-" + hashString(seed).slice(0, 8);
  }

  async function before(): Promise<UserTable> {
    await db.delete(T.users).where(E.eq(T.users.username, username));
    const user = await register({ username, password });
    return user;
  }

  async function after(): Promise<void> {
    await db.delete(T.users).where(E.eq(T.users.username, username));
  }

  return { before, after };
}

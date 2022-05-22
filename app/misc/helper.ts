import { Q, UserTable } from "../db/models";
import { register, sha256 } from "../utils/auth";

export function useUserImpl({
  username = "root",
  password = "pass",
  seed,
}: {
  username?: string;
  password?: string;
  seed?: string;
}) {
  // Generating random-ish username to avoid db uniqueness constraint
  if (seed !== undefined) {
    username += "-" + sha256(seed, "hex").slice(0, 8);
  }

  async function before(): Promise<UserTable> {
    await Q.users().delete().where("username", username);
    const user = await register({ username, password });
    return user;
  }

  async function after(): Promise<void> {
    await Q.users().delete().where("username", username);
  }

  return { before, after };
}

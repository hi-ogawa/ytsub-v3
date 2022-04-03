import type { Page, test as testDefault } from "@playwright/test";
import { users } from "../db/models";
import { sha256 } from "../utils/auth";
import { exec } from "../utils/node.server";

export function useUser(
  test: typeof testDefault,
  {
    username = "root",
    password = "pass",
    seed,
  }: { username?: string; password?: string; seed?: string }
) {
  let cookie: any;

  // Generating random-ish username to avoid db uniqueness constraint
  if (seed !== undefined) {
    username += "-" + sha256(seed).slice(0, 8);
  }

  test.beforeAll(async () => {
    await users().delete().where("username", username);
    const { stdout } = await exec(
      `npm run -s cli -- create-user ${username} ${password}`
    );
    const [name, value] = stdout.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
  });

  async function signin(page: Page) {
    await page.context().addCookies([cookie]);
  }

  return { username, signin };
}

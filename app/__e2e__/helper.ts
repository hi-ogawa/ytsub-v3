import type { Page, test as testDefault } from "@playwright/test";
import { tables } from "../db/models";
import { sha256 } from "../utils/auth";
import { exec } from "../utils/node.server";

// cf. `useUser` in routes/__tests__/helper.ts
export function useUserE2E(
  test: typeof testDefault,
  {
    username = "root",
    password = "pass",
    seed,
  }: { username?: string; password?: string; seed?: string }
) {
  // Generating random-ish username to avoid db uniqueness constraint
  if (seed !== undefined) {
    username += "-" + sha256(seed).slice(0, 8);
  }

  let cookie: any;

  test.beforeAll(async () => {
    await tables.users().delete().where("username", username);
    // TODO: use `register({ username, password });`
    const { stdout } = await exec(
      `npm run -s cli -- create-user ${username} ${password}`
    );
    const [name, value] = stdout.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
  });

  test.afterAll(async () => {
    await tables.users().delete().where("username", username);
  });

  async function signin(page: Page) {
    await page.context().addCookies([cookie]);
  }

  return { user: () => ({ username }), signin };
}

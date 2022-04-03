import type { Page, test as testDefault } from "@playwright/test";
import { users } from "../db/models";
import { exec } from "../utils/node.server";

export function useUser(
  test: typeof testDefault,
  { username, password = "pass" }: { username: string; password?: string }
) {
  let cookie: any;

  test.beforeAll(async () => {
    await users().truncate();
    const { stdout } = await exec(
      `npm run -s cli -- create-user ${username} ${password}`
    );
    const [name, value] = stdout.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
  });

  return async (page: Page) => {
    await page.context().addCookies([cookie]);
  };
}

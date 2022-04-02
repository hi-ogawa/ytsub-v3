import * as childProcess from "child_process";
import { promisify } from "util";
import type { Page } from "@playwright/test";
import { users } from "../db/models";

export const exec = promisify(childProcess.exec);

export function useUser(
  test: typeof import("@playwright/test").test,
  { username, password = "root" }: { username: string; password?: string }
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

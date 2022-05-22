import type { Page, test as testDefault } from "@playwright/test";
import { installGlobals } from "@remix-run/node";
import { Q, UserTable } from "../db/models";
import { assertOk } from "../misc/assert-ok";
import { useUserImpl } from "../misc/helper";
import { createUserCookie } from "../utils/auth";

// Remix's cookie manipulation requires atob, sign, etc...
// This is here because playwright cannot inject global in `globalSetup`
installGlobals();

// cf. `useUser` in routes/__tests__/helper.ts
export function useUserE2E(
  test: typeof testDefault,
  ...args: Parameters<typeof useUserImpl>
) {
  const { before, after } = useUserImpl(...args);

  let user: UserTable;
  let cookie: any;

  test.beforeAll(async () => {
    user = await before();
    const rawCookie = await createUserCookie(user);
    const [name, value] = rawCookie.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
  });

  test.afterAll(async () => {
    await after();
  });

  async function signin(page: Page) {
    await page.context().addCookies([cookie]);
  }

  return { user: () => user, signin };
}

// cf. app/misc/test-setup-global-e2e.ts
export function useDevUserE2e(test: typeof testDefault) {
  let user: UserTable;
  let cookie: any;

  test.beforeAll(async () => {
    const maybeUser = await Q.users().where("username", "dev").first();
    assertOk(maybeUser);
    user = maybeUser;

    const rawCookie = await createUserCookie(user);
    const [name, value] = rawCookie.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
  });

  async function signin(page: Page) {
    await page.context().addCookies([cookie]);
  }

  return { user: () => user, signin };
}

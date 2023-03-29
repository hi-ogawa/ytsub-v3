import { tinyassert } from "@hiogawa/utils";
import { Page, test, test as testDefault } from "@playwright/test";
import { Q, UserTable } from "../db/models";
import { useUserImpl } from "../misc/helper";
import { testSetupCommon } from "../misc/test-setup-common";
import { createUserCookie } from "../utils/auth";

// need to setup for each test since playwright cannot inject global in `globalSetup`
test.beforeAll(async () => {
  await testSetupCommon();
});

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
    tinyassert(maybeUser);
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

// force dismissing toasts since they can interfere with interactions.
export async function forceDismissToast(page: Page) {
  await page
    .locator("data-test=forceDismissToast")
    .evaluate((node: HTMLElement) => node.click());
}

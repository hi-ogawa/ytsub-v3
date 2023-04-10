import { newPromiseWithResolvers } from "@hiogawa/utils";
import { Page, test } from "@playwright/test";
import type { UserTable } from "../db/models";
import { useUserImpl } from "../misc/test-helper-common";
import { testSetupCommon } from "../misc/test-setup-common";
import { createUserCookie } from "../utils/auth";

type Test = typeof test;

// TODO: avoid e2e code to depend on application code
// need to setup for each test since playwright cannot inject global in `globalSetup`
test.beforeAll(async () => {
  await testSetupCommon();
});

// cf. `useUser` in routes/__tests__/helper.ts
export function useUserE2E(
  test: Test,
  ...args: Parameters<typeof useUserImpl>
) {
  const { before, after } = useUserImpl(...args);

  let user: UserTable;
  let cookie: any;
  let isReady = newPromiseWithResolvers<void>();

  test.beforeAll(async () => {
    user = await before();
    const rawCookie = await createUserCookie(user);
    const [name, value] = rawCookie.split(";")[0].split("=");
    cookie = { name, value, domain: "localhost", path: "/" };
    isReady.resolve();
  });

  test.afterAll(async () => {
    await after();
  });

  async function signin(page: Page) {
    await page.context().addCookies([cookie]);
  }

  return {
    signin,
    isReady: isReady.promise,
    get data() {
      return user;
    },
  };
}

// force dismissing toasts since they can interfere with interactions.
export async function forceDismissToast(page: Page) {
  await page
    .locator("data-test=forceDismissToast")
    .evaluate((node: HTMLElement) => node.click());
}

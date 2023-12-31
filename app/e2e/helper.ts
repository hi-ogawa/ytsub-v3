import { newPromiseWithResolvers } from "@hiogawa/utils";
import { Page, test } from "@playwright/test";
import type { UserTable } from "#db/models";
import { useUserImpl } from "#misc/test-helper-common";
import { testSetupCommon } from "#misc/test-setup-common";
import { writeCookieSession } from "#server/request-context/session";

type Test = typeof test;

// TODO: avoid e2e code to depend on application code
// need to setup for each test since playwright cannot inject global in `globalSetup`
test.beforeAll(async () => {
  await testSetupCommon();
});

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
    const rawCookie = await writeCookieSession({ user: { id: user.id } });
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

export async function waitForHydration(page: Page) {
  await page.locator("#root.hydrated").waitFor({ state: "attached" });
}

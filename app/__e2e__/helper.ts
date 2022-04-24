import * as path from "path";
import { Page, test as testDefault } from "@playwright/test";
import { installGlobals } from "@remix-run/node";
import * as fse from "fs-extra";
import { UserTable } from "../db/models";
import { useUserImpl } from "../misc/helper";
import { createUserCookie, sha256 } from "../utils/auth";

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

// cf.
// - https://playwright.dev/docs/test-fixtures#overriding-fixtures
// - https://playwright.dev/docs/api/class-coverage
export const testCoverage = testDefault.extend({
  page: async ({ page }, use, testInfo) => {
    if (!process.env.E2E_COVERAGE) {
      await use(page);
      return;
    }
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);

    // create a json file with the same format as c8
    // - https://github.com/bcoe/c8
    // - https://nodejs.org/dist/latest-v16.x/docs/api/cli.html#node_v8_coveragedir
    let entries = await page.coverage.stopJSCoverage();
    entries = entries.map(preprocessCoverageEntry);
    const id = sha256([testInfo.file, ...testInfo.titlePath].join("@"), "hex");
    const outfile = path.resolve("coverage", "tmp-client", id + ".json");
    await fse.ensureDir(path.dirname(outfile));
    await fse.writeFile(outfile, JSON.stringify({ result: entries }));
  },
});

type CoverageEntry = Awaited<
  ReturnType<Page["coverage"]["stopJSCoverage"]>
>[number];

const BUILD_URL = `http://localhost:3001/build`;
const BUILD_DIR = path.resolve("build", "remix", "test", "public", "build");

function preprocessCoverageEntry(entry: CoverageEntry): CoverageEntry {
  let { url } = entry;
  if (entry.url.startsWith(BUILD_URL)) {
    url = entry.url.replace(BUILD_URL, BUILD_DIR);
  }
  return { ...entry, url };
}

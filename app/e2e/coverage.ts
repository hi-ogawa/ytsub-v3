import fs from "node:fs/promises";
import path from "node:path";
import { hashString } from "@hiogawa/utils";
import { Page, test as testDefault } from "@playwright/test";

// cf.
// - https://playwright.dev/docs/test-fixtures#overriding-fixtures
// - https://playwright.dev/docs/api/class-coverage
export const test = testDefault.extend({
  page: async ({ page }, use, testInfo) => {
    if (process.env.E2E_CLIENT_LOG) {
      page.on("console", (msg) => {
        console.log(
          [
            `e2e-client(${testInfo.workerIndex})`,
            msg.type().toUpperCase(),
            msg.text(),
          ].join(" | ")
        );
      });
    }

    if (!process.env.E2E_COVERAGE_CLIENT) {
      await use(page);
      return;
    }
    // TOOD: not working
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);

    // create a json file with the same format as c8
    // - https://github.com/bcoe/c8
    // - https://nodejs.org/dist/latest-v16.x/docs/api/cli.html#node_v8_coveragedir
    let entries = await page.coverage.stopJSCoverage();
    entries = entries.map(preprocessCoverageEntry);
    const id = hashString([testInfo.file, ...testInfo.titlePath].join("@"));
    const outfile = path.resolve("coverage", "e2e-client", "tmp", id + ".json");
    await fs.mkdir(path.dirname(outfile), { recursive: true });
    await fs.writeFile(outfile, JSON.stringify({ result: entries }));
  },
});

type CoverageEntry = Awaited<
  ReturnType<Page["coverage"]["stopJSCoverage"]>
>[number];

const BUILD_URL = `http://localhost:3001/build`;
const BUILD_DIR = path.resolve("build");

function preprocessCoverageEntry(entry: CoverageEntry): CoverageEntry {
  entry = { ...entry };
  if (entry.url.startsWith(BUILD_URL)) {
    entry.url = entry.url.replace(BUILD_URL, BUILD_DIR);
  }
  return entry;
}

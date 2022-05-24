import * as fs from "fs";
import { cac } from "cac";
import { assert } from "./assert";

const cli = cac("cli").help();

cli
  .command("[...files]")
  .option("--cache-location <cacheLocation>", "", { default: ".cache-run" })
  .option("--command <command>", "")
  .action(cacheRun);

interface CacheEntry {
  hash: string;
  status: number;
  output: string;
}

interface Cache {
  entries: Record<string, CacheEntry | undefined>;
}

async function cacheRun(
  files: string[],
  options: { cacheLocation: string; command?: string }
) {
  assert(options.command, "required option '--command'");

  // setup cache
  let preCache: Cache = { entries: {} };
  const postCache: Cache = { entries: {} };
  if (fs.existsSync(options.cacheLocation)) {
    const preContent = await fs.promises.readFile(
      options.cacheLocation,
      "utf-8"
    );
    try {
      preCache = JSON.parse(preContent);
    } catch (e) {
      throw new Error("invalid cache file");
    }
  }

  for (const file of files) {
    const preEntry = preCache.entries[file];
    if (preEntry) {
      preEntry.hash;
    }
  }

  // save cache
  await fs.promises.writeFile(options.cacheLocation, JSON.stringify(postCache));
}

if (require.main === module) {
  cli.parse();
}

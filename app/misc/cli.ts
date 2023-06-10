import { deepEqual } from "assert/strict";
import fs from "node:fs";
import { groupBy, objectPick, range, tinyassert, zip } from "@hiogawa/utils";
import { cac } from "cac";
import consola from "consola";
import { sql } from "drizzle-orm";
import { z } from "zod";
import * as zx from "zx";
import {
  E,
  T,
  db,
  dbGetMigrationStatus,
  dbGetSchema,
  selectOne,
} from "../db/drizzle-client.server";
import {
  deleteOrphans,
  filterNewVideo,
  insertVideoAndCaptionEntries,
} from "../db/helper";
import { createUserCookie, findByUsername, register } from "../utils/auth";
import { exec, streamToString } from "../utils/node.server";
import { toPasswordHash } from "../utils/password-utils";
import {
  queryNextPracticeEntryRandomModeBatch,
  resetDeckCache,
} from "../utils/practice-system";
import { Z_VIDEO_METADATA } from "../utils/types";
import {
  NewVideo,
  captionConfigToUrl,
  fetchCaptionEntries,
  fetchVideoMetadata,
  fetchVideoMetadataRaw,
  toCaptionConfigOptions,
  ttmlToEntries,
} from "../utils/youtube";
import { finalizeServer, initializeServer } from "./initialize-server";
import { exportDeckJson, importDeckJson } from "./seed-utils";

const cli = cac("cli").help();

//
// db:test-migrations
//

cli
  .command("db:test-migrations")
  .option("--show-schema", "[boolean]", { default: false })
  .option("--unit-test", "[boolean]", { default: false })
  .option("--reversibility-test", "[boolean]", { default: false })
  .action(clieDbTestMigrations);

async function clieDbTestMigrations(options: {
  showSchema: boolean;
  unitTest: boolean;
  reversibilityTest: boolean;
}) {
  const { completedFiles, pendingFiles } = await dbGetMigrationStatus();

  console.error(":: list completed");
  for (const file of completedFiles) {
    console.error(file);
  }

  console.error(":: list pending");
  for (const file of pendingFiles) {
    console.error(file);
  }

  const ups = [];
  const downs = [];

  console.error(":: running migrations");
  if (options.unitTest) {
    process.env.MIGRATION_UNIT_TEST = "1";
  }

  const n = pendingFiles.length;
  ups.push(await dbGetSchema());
  for (const i of range(n)) {
    console.error(`(⇑:${i + 1}/${n}) ${pendingFiles[i]}`);
    await exec("pnpm knex migrate:up");
    ups.push(await dbGetSchema());
  }

  downs.unshift(await dbGetSchema());
  for (const i of range(n)) {
    console.error(`(⇓:${i + 1}/${n}) ${pendingFiles[n - i - 1]}`);
    await exec("pnpm knex migrate:down");
    downs.unshift(await dbGetSchema());
  }

  if (options.showSchema) {
    console.log(JSON.stringify(zip(ups, downs), null, 2));
  }

  if (options.reversibilityTest) {
    for (const [up, down] of zip(ups, downs)) {
      deepEqual(up, down);
    }
    console.error(":: reversibility test success");
  }
}

//
// create-user
//

cli
  .command("create-user <username> <password>")
  .option("--language1 <language1>", "[string]", { default: "fr" })
  .option("--language2 <language2>", "[string]", { default: "en" })
  .action(
    async (
      username: string,
      password: string,
      { language1, language2 }: { language1: string; language2: string }
    ) => {
      const user = await register({ username, password });
      await db
        .update(T.users)
        .set({ language1, language2 })
        .where(E.eq(T.users.id, user.id));
      await printSession(username);
    }
  );

cli
  .command("resetPassword <username> <password>")
  .action(async (username: string, password: string) => {
    const user = await findByUsername(username);
    tinyassert(user);
    await db
      .update(T.usersCredentials)
      .set({ passwordHash: await toPasswordHash(password) })
      .where(E.eq(T.users.id, user.id));
  });

cli.command("print-session <username>").action(async (username: string) => {
  await printSession(username);
});

cli
  .command("create-videos")
  .option("--username <username>", "[string]")
  .action(async (options: { username?: string }) => {
    const input = await streamToString(process.stdin);
    const newVideos: NewVideo[] = JSON.parse(input);
    let userId = undefined;
    if (options.username) {
      const user = await selectOne(
        T.users,
        E.eq(T.users.username, options.username)
      );
      tinyassert(user);
      userId = user.id;
    }
    const total = newVideos.length;
    for (const [i, newVideo] of Object.entries(newVideos)) {
      console.error(
        `(${Number(i) + 1}/${total}) processing - ${JSON.stringify(newVideo)}`
      );
      const rows = await filterNewVideo(newVideo, userId);
      if (rows.length > 0) {
        console.error("skipped");
        continue;
      }
      const data = await fetchCaptionEntries(newVideo);
      await insertVideoAndCaptionEntries(newVideo, data, userId);
    }
  });

//
// fetchCaptionEntries
//

const commandFetchCaptionEntriesArgs = z.object({
  videoId: z.string(),
  language1: z.string(),
  language2: z.string(),
  outFile: z.string(),
});

// prettier-ignore
cli
  .command("fetchCaptionEntries")
  .option(`--${commandFetchCaptionEntriesArgs.keyof().enum.videoId} [string]`, "")
  .option(`--${commandFetchCaptionEntriesArgs.keyof().enum.language1} [string]`, "")
  .option(`--${commandFetchCaptionEntriesArgs.keyof().enum.language2} [string]`, "")
  .option(`--${commandFetchCaptionEntriesArgs.keyof().enum.outFile} [string]`, "")
  .action(commandFetchCaptionEntries);

async function commandFetchCaptionEntries(rawArgs: unknown) {
  const args = commandFetchCaptionEntriesArgs.parse(rawArgs);
  const data = await fetchCaptionEntries({
    videoId: args.videoId,
    language1: {
      id: args.language1,
    },
    language2: {
      id: args.language2,
    },
  });
  await fs.promises.writeFile(args.outFile, JSON.stringify(data, null, 2));
}

//
// scrapeCaptionEntries
//   pnpm cli scrapeCaptionEntries --videoId='-UroBRG1rY8' --id .ko --outFile misc/youtube/data/zombie-ko.ttml
//   pnpm cli scrapeCaptionEntries --videoId='-UroBRG1rY8' --id .en --outFile misc/youtube/data/zombie-en.ttml
//

const scrapeCaptionEntriesArgs = z.object({
  videoId: z.string(),
  id: z.string().optional(),
  translation: z.string().optional(),
  formatJson: z.boolean().optional(),
  outFile: z.string().optional(),
});

// prettier-ignore
cli
  .command(scrapeCaptionEntries.name)
  .option(`--${scrapeCaptionEntriesArgs.keyof().enum.videoId} [string]`, "")
  .option(`--${scrapeCaptionEntriesArgs.keyof().enum.id} [string]`, "")
  .option(`--${scrapeCaptionEntriesArgs.keyof().enum.translation} [string]`, "")
  .option(`--${scrapeCaptionEntriesArgs.keyof().enum.formatJson}`, "")
  .option(`--${scrapeCaptionEntriesArgs.keyof().enum.outFile} [string]`, "")
  .action(scrapeCaptionEntries);

async function scrapeCaptionEntries(rawArgs: unknown) {
  const args = scrapeCaptionEntriesArgs.parse(rawArgs);

  console.error(":: fetching metadata...");
  const videoMetadata = await fetchVideoMetadata(args.videoId);

  // list available captions and pick interactively
  let id = args.id;
  if (!id) {
    const options = toCaptionConfigOptions(videoMetadata);
    console.error(":: available languages");
    console.error(options.captions);
    id = await zx.question(":: please select a language > ");
  }

  // fetch caption and format
  const url = captionConfigToUrl(
    { id, translation: args.translation },
    videoMetadata
  );
  tinyassert(url);
  const ttml = await fetch(url).then((res) => res.text());
  let output = ttml;
  if (args.formatJson) {
    const entries = ttmlToEntries(ttml);
    output = JSON.stringify(entries, null, 2);
  }

  if (args.outFile) {
    await fs.promises.writeFile(args.outFile, output);
  } else {
    console.log(output);
  }
}

//
// pnpm cli scrapeYoutube --videoId='-UroBRG1rY8'
//

const scrapeYoutubeArgs = z.object({
  videoId: z.string(),
  outDir: z.string().default("./misc/youtube/data"),
});

// prettier-ignore
cli
  .command(scrapeYoutube.name)
  .option(`--${scrapeYoutubeArgs.keyof().enum.videoId} [string]`, "")
  .option(`--${scrapeYoutubeArgs.keyof().enum.outDir} [string]`, "")
  .action(scrapeYoutube);

async function scrapeYoutube(rawArgs: unknown) {
  const args = scrapeYoutubeArgs.parse(rawArgs);
  const dir = `${args.outDir}/${args.videoId}`;
  await zx.$`mkdir -p ${dir}`;

  console.log(`:: fetching metadata to '${dir}/metadata.json'...`);
  const metadataRaw = await fetchVideoMetadataRaw(args.videoId);
  await fs.promises.writeFile(
    `${dir}/metadata.json`,
    JSON.stringify(metadataRaw, null, 2)
  );

  // list available captions and pick interactively
  const videoMetadata = Z_VIDEO_METADATA.parse(metadataRaw);
  const options = toCaptionConfigOptions(videoMetadata);
  console.log(":: available languages");
  console.log(options.captions);

  while (true) {
    const input = await zx.question(
      ":: please input language+translation (e.g. .en, .en_fr) > "
    );
    if (!input) {
      break;
    }
    const [id, translation] = input.split("_");

    // fetch caption and format
    const url = captionConfigToUrl({ id, translation }, videoMetadata);
    tinyassert(url);
    const ttml = await fetch(url).then((res) => res.text());
    await fs.promises.writeFile(`${dir}/${input}.ttml`, ttml);
  }
}

//
// seed export/import e.g.
//   pnpm cli db-seed-export --deckId 1 --outFile misc/db/dev.json
//   pnpm cli db-seed-import --username dev-import --inFile misc/db/dev.json
//

//
// db-seed-export
//

const commandDbSeedExportArgs = z.object({
  deckId: z.coerce.number().int(),
  outFile: z.string(),
});

cli
  .command("db-seed-export")
  .option(`--${commandDbSeedExportArgs.keyof().enum.deckId} [number]`, "")
  .option(`--${commandDbSeedExportArgs.keyof().enum.outFile} [string]`, "")
  .action(commandDbSeedExport);

async function commandDbSeedExport(rawArgs: unknown) {
  const args = commandDbSeedExportArgs.parse(rawArgs);
  const data = await exportDeckJson(args.deckId);
  await fs.promises.writeFile(args.outFile, JSON.stringify(data, null, 2));
}

//
// db-seed-import
//

const commandDbSeedImportArgs = z.object({
  username: z.string(),
  inFile: z.string(),
});

cli
  .command("db-seed-import")
  .option(`--${commandDbSeedImportArgs.keyof().enum.username} [string]`, "")
  .option(`--${commandDbSeedImportArgs.keyof().enum.inFile} [string]`, "")
  .action(commandDbSeedImport);

async function commandDbSeedImport(argsRaw: unknown) {
  const args = commandDbSeedImportArgs.parse(argsRaw);
  const user = await findByUsername(args.username);
  tinyassert(user);
  const fileDataRaw = await fs.promises.readFile(args.inFile, "utf-8");
  await importDeckJson(user.id, JSON.parse(fileDataRaw));
}

//
// clean-data
//

cli
  .command("clean-data <only-username>")
  .option("--delete-anonymous-videos", "[boolean]", { default: false })
  .action(
    async (
      onlyUsername: string,
      options: { deleteAnonymousVideos: boolean }
    ) => {
      // delete except `onlyUsername`
      await db
        .delete(T.users)
        .where(E.not(E.eq(T.users.username, onlyUsername)));
      if (options.deleteAnonymousVideos) {
        // delete anonymous videos
        await db.delete(T.videos).where(E.isNull(T.videos.userId));
      }
      await deleteOrphans();
      // rename to "dev"
      await db
        .update(T.usersCredentials)
        .set({ username: "dev", passwordHash: await toPasswordHash("dev") })
        .where(E.eq(T.users.username, onlyUsername));
    }
  );

//
// reset-counter-cache:videos.bookmarkEntriesCount
//

cli
  .command("reset-counter-cache:videos.bookmarkEntriesCount")
  .action(async () => {
    // TODO: single UPDATE statement with sub query?
    const rows = await db
      .select({
        id: T.videos.id,
        bookmarkEntriesCount: sql<number>`COALESCE(COUNT(${T.bookmarkEntries.id}), 0)`,
        udpatedAt: T.videos.updatedAt,
      })
      .from(T.videos)
      .leftJoin(T.bookmarkEntries, E.eq(T.bookmarkEntries.videoId, T.videos.id))
      .groupBy(T.videos.id);
    for (const row of rows) {
      await db
        .update(T.videos)
        .set({
          bookmarkEntriesCount: row.bookmarkEntriesCount,
          updatedAt: row.udpatedAt, // keep current timestamp
        })
        .where(E.eq(T.videos.id, row.id));
    }
  });

//
// reset-counter-cache:practiceEntries.practiceActionsCount
//

cli
  .command("reset-counter-cache:practiceEntries.practiceActionsCount")
  .action(async () => {
    const rows = await db
      .select({
        id: T.practiceEntries.id,
        practiceActionsCount: sql<number>`COALESCE(COUNT(${T.practiceActions.id}), 0)`,
        udpatedAt: T.practiceEntries.updatedAt,
      })
      .from(T.practiceEntries)
      .innerJoin(
        T.practiceActions,
        E.eq(T.practiceActions.practiceEntryId, T.practiceEntries.id)
      )
      .groupBy(T.practiceEntries.id);

    for (const row of rows) {
      await db
        .update(T.practiceEntries)
        .set({
          practiceActionsCount: row.practiceActionsCount,
          updatedAt: row.udpatedAt, // keep current timestamp
        })
        .where(E.eq(T.practiceEntries.id, row.id));
    }
  });

async function printSession(username: string) {
  const user = await findByUsername(username);
  tinyassert(user);
  const cookie = await createUserCookie(user);
  console.log(cookie);
}

//
// resetDeckCache
//

const resetDeckCacheArgs = z.object({
  deckId: z.coerce.number().int().optional(),
});

cli
  .command(resetDeckCache.name)
  .option(`--${resetDeckCacheArgs.keyof().enum.deckId} [number]`, "")
  .action(resetDeckCacheCommand);

async function resetDeckCacheCommand(rawArgs: unknown) {
  const args = resetDeckCacheArgs.parse(rawArgs);
  if (args.deckId) {
    console.log("::", JSON.stringify(args));
    await resetDeckCache(args.deckId);
    return;
  }

  const decks = await db.select().from(T.decks);
  for (const deck of decks) {
    console.log(
      "::",
      JSON.stringify(objectPick(deck, ["userId", "id", "name"]))
    );
    await resetDeckCache(deck.id);
  }
}

//
// debugCacheNextEntries
//

const debugCacheNextEntriesArgs = z.object({
  deckId: z.coerce.number().int(),
});

cli
  .command(debugCacheNextEntries.name)
  .option(`--${debugCacheNextEntriesArgs.keyof().enum.deckId} [number]`, "")
  .action(debugCacheNextEntries);

async function debugCacheNextEntries(rawArgs: unknown) {
  const args = debugCacheNextEntriesArgs.parse(rawArgs);
  const deck = await selectOne(T.decks, E.eq(T.decks.id, args.deckId));
  tinyassert(deck);

  const ids = deck.cache.nextEntriesRandomMode;
  console.log({ ids });
  if (ids.length === 0) {
    return;
  }

  const entries = await db
    .select()
    .from(T.practiceEntries)
    .where(E.inArray(T.practiceEntries.id, ids));
  console.log(entries);
}

//
// debugRandomMode
//

const debugRandomModeArgs = z.object({
  deckId: z.coerce.number().int(),
  count: z.coerce.number().default(10),
  seed: z.coerce.number().default(Date.now()),
});

cli
  .command(debugRandomMode.name)
  .option(`--${debugRandomModeArgs.keyof().enum.deckId} [number]`, "")
  .option(`--${debugRandomModeArgs.keyof().enum.count} [number]`, "")
  .option(`--${debugRandomModeArgs.keyof().enum.seed} [number]`, "")
  .action(debugRandomMode);

async function debugRandomMode(rawArgs: unknown) {
  const args = debugRandomModeArgs.parse(rawArgs);
  const deck = await selectOne(T.decks, E.eq(T.decks.id, args.deckId));
  tinyassert(deck);

  // get practice order
  const scoredEntries = await queryNextPracticeEntryRandomModeBatch(
    args.deckId,
    new Date(),
    args.count,
    args.seed
  );

  // get all rows
  const rows = await db
    .select()
    .from(T.practiceEntries)
    .innerJoin(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
    )
    .innerJoin(
      T.captionEntries,
      E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
    )
    .innerJoin(T.videos, E.eq(T.videos.id, T.bookmarkEntries.videoId))
    .where(E.eq(T.practiceEntries.deckId, args.deckId));

  const rowsById = groupBy(rows, (row) => row.practiceEntries.id);

  // format
  const formatted = scoredEntries.map((s) => {
    const e = rowsById.get(s.id)![0];
    const picked = [
      objectPick(e.bookmarkEntries, ["text"]),
      objectPick(e.captionEntries, ["text1", "text2", "begin"]),
      objectPick(e.videos, ["title", "bookmarkEntriesCount"]),
      objectPick(e.practiceEntries, [
        "scheduledAt",
        "queueType",
        "practiceActionsCount",
      ]),
      objectPick(s, ["score"]),
    ];
    const combined = Object.assign({}, ...picked);
    return combined;
  });
  console.log(JSON.stringify(formatted, null, 2));
}

//
// fixBookmarkEntriesOffset
//

const fixBookmarkEntriesOffsetArgs = z.object({
  update: z.boolean().default(false),
});

cli
  .command(fixBookmarkEntriesOffset.name)
  .option(`--${fixBookmarkEntriesOffsetArgs.keyof().enum.update} [boolean]`, "")
  .action(fixBookmarkEntriesOffset);

async function fixBookmarkEntriesOffset(rawArgs: unknown) {
  const args = fixBookmarkEntriesOffsetArgs.parse(rawArgs);
  const rows = await db
    .select()
    .from(T.bookmarkEntries)
    .innerJoin(
      T.captionEntries,
      E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
    );

  const stats = {
    total: 0,
    fixable: 0,
  };

  for (const row of rows) {
    const { id, text, offset, side } = row.bookmarkEntries;
    const captionText = [row.captionEntries.text1, row.captionEntries.text2][
      side
    ];

    const textByOffset = captionText.slice(offset).slice(0, text.length);
    if (textByOffset !== text) {
      const newOffset = offset - text.length;
      const textByNewOffset = captionText
        .slice(newOffset)
        .slice(0, text.length);

      const fixable = textByNewOffset === text;
      stats.total++;
      stats.fixable += Number(fixable);

      console.log(
        fixable ? "[ok]" : "[no]",
        { text, textByOffset, textByNewOffset },
        row
      );

      if (args.update) {
        await db
          .update(T.bookmarkEntries)
          .set({ offset: newOffset })
          .where(E.eq(T.bookmarkEntries.id, id));
      }
    }
  }

  console.log({ stats });
}

//
// main
//

async function main() {
  try {
    await initializeServer();
    cli.parse(undefined, { run: false });
    if (!cli.matchedCommandName) {
      cli.outputHelp();
      process.exit(1);
    }
    await cli.runMatchedCommand();
  } catch (e) {
    consola.error(e);
    process.exit(1);
  } finally {
    await finalizeServer();
  }
}

if (require.main === module) {
  main();
}

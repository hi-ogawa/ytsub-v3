import { deepEqual } from "assert/strict";
import fs from "node:fs";
import { objectPick, range, tinyassert } from "@hiogawa/utils";
import { cac } from "cac";
import consola from "consola";
import { z } from "zod";
import { client } from "../db/client.server";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import {
  Q,
  deleteOrphans,
  filterNewVideo,
  insertVideoAndCaptionEntries,
} from "../db/models";
import {
  createUserCookie,
  findByUsername,
  register,
  toPasswordHash,
  verifySignin,
} from "../utils/auth";
import { zip } from "../utils/misc";
import { exec, streamToString } from "../utils/node.server";
import { resetDeckCache } from "../utils/practice-system";
import { NewVideo, fetchCaptionEntries } from "../utils/youtube";
import { finalizeServer, initializeServer } from "./initialize-server";
import { exportDeckJson, importDeckJson } from "./seed-utils";

const cli = cac("cli").help();

cli
  .command("db:schema")
  .option("--show-create-table", "[boolean]", { default: false })
  .option("--inclue-knex", "[boolean]", { default: false })
  .option("--json", "[boolean]", { default: false })
  .action(
    async (options: {
      showCreateTable: boolean;
      includeKnex: boolean;
      json: boolean;
    }) => {
      const schema = await getSchema(options);
      const result = options.json ? JSON.stringify(schema, null, 2) : schema;
      console.log(result);
    }
  );

async function getTableNames(): Promise<string[]> {
  const [rows, columnDefs] = await client.raw("SHOW TABLES");
  return rows.map((row: any) => row[columnDefs[0].name]);
}

async function getSchema(options: {
  showCreateTable: boolean;
  includeKnex: boolean;
}): Promise<Record<string, any>> {
  let names = await getTableNames();
  if (!options.includeKnex) {
    names = names.filter((name) => !name.startsWith("knex_"));
  }
  const result: Record<string, any> = {};
  for (const name of names) {
    if (options.showCreateTable) {
      const [rows] = await client.raw(`SHOW CREATE TABLE ${name}`);
      result[name] = rows[0]["Create Table"];
    } else {
      const [fields] = await client.raw(`DESCRIBE ${name}`);
      const [indices] = await client.raw(`SHOW INDEX FROM ${name}`);
      result[name] = {
        describe: Object.fromEntries(
          fields.map((row: any) => [row.Field, row])
        ),
        index: Object.fromEntries(
          indices.map((row: any) => [row.Key_name, row])
        ),
      };
    }
  }
  return result;
}

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
  const [completed, pending] = (await client.migrate.list()) as [
    { name: string }[],
    { file: string }[]
  ];

  console.error(":: list completed");
  for (const { name } of completed) {
    console.error(name);
  }

  console.error(":: list pending");
  for (const { file } of pending) {
    console.error(file);
  }

  const ups = [];
  const downs = [];

  const getSchema_ = () =>
    getSchema({ showCreateTable: false, includeKnex: false });

  console.error(":: running migrations");
  if (options.unitTest) {
    process.env.MIGRATION_UNIT_TEST = "1";
  }

  const n = pending.length;
  ups.push(await getSchema_());
  for (const i of range(n)) {
    console.error(`(⇑:${i + 1}/${n}) ${pending[i].file}`);
    await exec("pnpm knex migrate:up");
    ups.push(await getSchema_());
  }

  downs.unshift(await getSchema_());
  for (const i of range(n)) {
    console.error(`(⇓:${i + 1}/${n}) ${pending[n - i - 1].file}`);
    await exec("pnpm knex migrate:down");
    downs.unshift(await getSchema_());
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
      await Q.users().update({ language1, language2 }).where("id", user.id);
      await printSession(username, password);
    }
  );

cli
  .command("print-session <username> <password>")
  .action(async (username: string, password: string) => {
    await printSession(username, password);
  });

cli
  .command("create-videos")
  .option("--username <username>", "[string]")
  .action(async (options: { username?: string }) => {
    const input = await streamToString(process.stdin);
    const newVideos: NewVideo[] = JSON.parse(input);
    let userId = undefined;
    if (options.username) {
      const user = await Q.users()
        .where("username", options.username)
        .select("id")
        .first();
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
// import-bookmark-entries
//

const OLD_BOOKMARK_ENTRY_SCHEMA = z.object({
  watchParameters: z.object({
    videoId: z.string(),
    captions: z.array(
      z.object({
        id: z.string(),
        translation: z.string().optional(),
      })
    ),
  }),
  captionEntry: z.object({
    begin: z.number(),
    end: z.number(),
    text1: z.string(),
    text2: z.string(),
  }),
  bookmarkText: z.string(),
});

type OldBookamrkEntry = z.infer<typeof OLD_BOOKMARK_ENTRY_SCHEMA>;

async function importBookmarkEntry(
  old: OldBookamrkEntry,
  userId: number
): Promise<[boolean, string]> {
  const {
    watchParameters: {
      videoId,
      captions: [language1, language2],
    },
    captionEntry: { begin },
    bookmarkText,
  } = old;

  const video = await findOne(
    filterNewVideo({ videoId, language1, language2 }, userId)
  );
  if (!video) return [false, "Video not found"];

  const captionEntry = await Q.captionEntries()
    .where({ videoId: video.id })
    .where(client.raw("abs(begin - ?) < 0.1", begin))
    .first();
  if (!captionEntry) return [false, "CaptionEntry not found"];

  if (
    !captionEntry.text1.includes(bookmarkText) &&
    !captionEntry.text2.includes(bookmarkText)
  ) {
    return [false, "Bookmark text not match"];
  }

  let side: number;
  let offset: number;
  if (captionEntry.text1.includes(bookmarkText)) {
    side = 0;
    offset = captionEntry.text1.indexOf(bookmarkText);
  } else {
    side = 1;
    offset = captionEntry.text2.indexOf(bookmarkText);
  }

  const found = await Q.bookmarkEntries()
    .where({
      userId,
      videoId: video.id,
      captionEntryId: captionEntry.id,
      side,
      offset,
      text: bookmarkText,
    })
    .first();
  if (found) {
    return [false, "Bookmark already exists"];
  }

  const [id] = await Q.bookmarkEntries().insert({
    userId,
    videoId: video.id,
    captionEntryId: captionEntry.id,
    side,
    offset,
    text: bookmarkText,
  });
  return [true, `Success (id = ${id})`];
}

cli
  .command("import-bookmark-entries <username>")
  .action(async (username: string) => {
    const user = await Q.users()
      .where("username", username)
      .select("id")
      .first();
    tinyassert(user);

    const input = await streamToString(process.stdin);
    const olds = z.array(OLD_BOOKMARK_ENTRY_SCHEMA).parse(JSON.parse(input));
    for (const old of olds) {
      console.log(
        `:: importing (${old.watchParameters.videoId}) ${old.bookmarkText}`
      );
      const [ok, message] = await importBookmarkEntry(old, user.id);
      console.error(ok ? "✔" : "✘", message, ok ? "" : JSON.stringify(old));
    }
  });

cli
  .command("clean-data <only-username>")
  .option("--delete-anonymous-videos", "[boolean]", { default: false })
  .action(
    async (
      onlyUsername: string,
      options: { deleteAnonymousVideos: boolean }
    ) => {
      // delete except `onlyUsername`
      await Q.users().delete().whereNot("username", onlyUsername);
      if (options.deleteAnonymousVideos) {
        // delete anonymous videos
        await Q.videos().delete().where("userId", null);
      }
      await deleteOrphans();
      // rename to "dev"
      await Q.users()
        .update({ username: "dev", passwordHash: await toPasswordHash("dev") })
        .where("username", onlyUsername);
    }
  );

cli
  .command("reset-counter-cache:videos.bookmarkEntriesCount")
  .action(async () => {
    await client.transaction(async (trx) => {
      const rows = await Q.videos()
        .transacting(trx)
        .select({
          id: "videos.id",
          bookmarkEntriesCount: client.raw(
            "COALESCE(COUNT(bookmarkEntries.id), 0)"
          ),
          updatedAt: "videos.updatedAt", // prevent changing `updatedAt` timestamp for the migration
          videoId: client.raw("'dummy'"),
          language1_id: client.raw("'dummy'"),
          language2_id: client.raw("'dummy'"),
          title: client.raw("'dummy'"),
          author: client.raw("'dummy'"),
          channelId: client.raw("'dummy'"),
        })
        .leftJoin("bookmarkEntries", "bookmarkEntries.videoId", "videos.id")
        .groupBy("videos.id");
      await Q.videos()
        .transacting(trx)
        .insert(rows)
        .onConflict("id")
        .merge(["id", "bookmarkEntriesCount", "updatedAt"]);
    });
  });

cli
  .command("reset-counter-cache:practiceEntries.practiceActionsCount")
  .action(async () => {
    await client.transaction(async (trx) => {
      const rows = await Q.practiceEntries()
        .transacting(trx)
        .select({
          id: "practiceEntries.id",
          practiceActionsCount: client.raw(
            "COALESCE(COUNT(practiceActions.id), 0)"
          ),
          updatedAt: "practiceEntries.updatedAt", // prevent changing `updatedAt` timestamp for the migration
          queueType: client.raw("'dummy'"),
          easeFactor: 0,
          scheduledAt: client.raw("'2022-06-24 12:00:00'"),
          deckId: 0,
          bookmarkEntryId: 0,
        })
        .leftJoin(
          "practiceActions",
          "practiceActions.practiceEntryId",
          "practiceEntries.id"
        )
        .groupBy("practiceEntries.id");
      await Q.practiceEntries()
        .transacting(trx)
        .insert(rows)
        .onConflict("id")
        .merge(["id", "practiceActionsCount", "updatedAt"]);
    });
  });

async function printSession(username: string, password: string) {
  const user = await verifySignin({ username, password });
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
  const deck = await findOne(
    db.select().from(T.decks).where(E.eq(T.decks.id, args.deckId))
  );
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
    await cli.runMatchedCommand();
  } catch (e) {
    consola.error(e);
    process.exit(1);
  } finally {
    // TODO: fix mysql driver warning?
    //   Warning: got packets out of order. Expected 22 but received 0
    await finalizeServer();
  }
}

if (require.main === module) {
  main();
}

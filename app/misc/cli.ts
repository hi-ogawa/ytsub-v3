import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { cac } from "cac";
import { range, zip } from "lodash";
import { z } from "zod";
import { client } from "../db/client.server";
import {
  filterNewVideo,
  insertVideoAndCaptionEntries,
  tables,
} from "../db/models";
import { createUserCookie, register, verifySignin } from "../utils/auth";
import { exec, streamToString } from "../utils/node.server";
import { NewVideo, fetchCaptionEntries } from "../utils/youtube";

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
      await client.destroy();
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
      const [rows] = await client.raw(`DESCRIBE ${name}`);
      result[name] = Object.fromEntries(
        rows.map((row: any) => [row.Field, row])
      );
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
    getSchema({ showCreateTable: true, includeKnex: false });

  console.error(":: running migrations");
  if (options.unitTest) {
    process.env.MIGRATION_UNIT_TEST = "1";
  }

  const n = pending.length;
  ups.push(await getSchema_());
  for (const i of range(n)) {
    console.error(`(⇑:${i + 1}/${n}) ${pending[i].file}`);
    await exec("npx knex migrate:up");
    ups.push(await getSchema_());
  }

  downs.unshift(await getSchema_());
  for (const i of range(n)) {
    console.error(`(⇓:${i + 1}/${n}) ${pending[n - i - 1].file}`);
    await exec("npx knex migrate:down");
    downs.unshift(await getSchema_());
  }

  if (options.showSchema) {
    console.log(JSON.stringify(zip(ups, downs), null, 2));
  }
  await client.destroy();

  if (options.reversibilityTest) {
    assert.strict.deepEqual(ups, downs);
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
      await tables
        .users()
        .update({ language1, language2 })
        .where("id", user.id);
      await printSession(username, password);
      await client.destroy();
    }
  );

cli
  .command("print-session <username> <password>")
  .action(async (username: string, password: string) => {
    await printSession(username, password);
    await client.destroy();
  });

cli
  .command("create-videos")
  .option("--username <username>", "[string]")
  .action(async (options: { username?: string }) => {
    const input = await streamToString(process.stdin);
    const newVideos: NewVideo[] = JSON.parse(input);
    let userId = undefined;
    if (options.username) {
      const user = await tables
        .users()
        .where("username", options.username)
        .select("id")
        .first();
      assert.ok(user);
      userId = user.id;
    }
    const total = newVideos.length;
    for (const [i, newVideo] of Object.entries(newVideos)) {
      console.error(
        `(${Number(i) + 1}/${total}) processing - ${JSON.stringify(newVideo)}`
      );
      const row = await filterNewVideo(newVideo, userId).select("id").first();
      if (row) {
        console.error("skipped");
        continue;
      }
      const data = await fetchCaptionEntries(newVideo);
      await insertVideoAndCaptionEntries(newVideo, data, userId);
    }
    await client.destroy();
  });

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

  const video = await filterNewVideo(
    { videoId, language1, language2 },
    userId
  ).first();
  if (!video) return [false, "Video not found"];

  const captionEntry = await tables
    .captionEntries()
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

  const found = await tables
    .bookmarkEntries()
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

  const [id] = await tables.bookmarkEntries().insert({
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
    const user = await tables
      .users()
      .where("username", username)
      .select("id")
      .first();
    assert.ok(user);

    const input = await streamToString(process.stdin);
    const olds = z.array(OLD_BOOKMARK_ENTRY_SCHEMA).parse(JSON.parse(input));
    for (const old of olds) {
      console.log(
        `:: importing (${old.watchParameters.videoId}) ${old.bookmarkText}`
      );
      const [ok, message] = await importBookmarkEntry(old, user.id);
      console.error(ok ? "✔" : "✘", message, ok ? "" : JSON.stringify(old));
    }
    await client.destroy();
  });

async function printSession(username: string, password: string) {
  const user = await verifySignin({ username, password });
  const cookie = await createUserCookie(user);
  console.log(cookie);
}

if (require.main === module) {
  installGlobals();
  cli.parse();
}

import { deepEqual } from "assert/strict";
import fs from "node:fs";
import { defineCommand, defineSubCommands } from "@hiogawa/tiny-cli";
import { zArg } from "@hiogawa/tiny-cli/dist/zod";
import { groupBy, objectPick, range, tinyassert, zip } from "@hiogawa/utils";
import consola from "consola";
import { sql } from "drizzle-orm";
import { z } from "zod";
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
  fetchVideoMetadataRaw,
  toCaptionConfigOptions,
} from "../utils/youtube";
import { finalizeServer, initializeServer } from "./initialize-server";
import { exportDeckJson, importDeckJson } from "./seed-utils";

const dbTestMigrations = defineCommand(
  {
    args: {
      showSchema: zArg(z.coerce.boolean(), { type: "flag" }),
      unitTest: zArg(z.coerce.boolean(), { type: "flag" }),
      reversibilityTest: zArg(z.coerce.boolean(), { type: "flag" }),
    },
  },
  async ({ args: options }) => {
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
);

async function printSession(username: string) {
  const user = await findByUsername(username);
  tinyassert(user);
  const cookie = await createUserCookie(user);
  console.log(cookie);
}

const createUser = defineCommand(
  {
    args: {
      username: zArg(z.string(), { type: "positional" }),
      password: zArg(z.string(), { type: "positional" }),
      language1: z.string().default("fr"),
      language2: z.string().default("en"),
    },
  },
  async ({ args: { username, password, language1, language2 } }) => {
    const user = await register({ username, password });
    await db
      .update(T.users)
      .set({ language1, language2 })
      .where(E.eq(T.users.id, user.id));
    await printSession(username);
  }
);

const resetPassword = defineCommand(
  {
    args: {
      username: zArg(z.string(), { type: "positional" }),
      password: zArg(z.string(), { type: "positional" }),
    },
  },
  async ({ args: { username, password } }) => {
    const user = await findByUsername(username);
    tinyassert(user);
    await db
      .update(T.usersCredentials)
      .set({ passwordHash: await toPasswordHash(password) })
      .where(E.eq(T.users.id, user.id));
  }
);

const printSessionCommand = defineCommand(
  {
    args: {
      username: zArg(z.string(), { type: "positional" }),
    },
  },
  async ({ args: { username } }) => {
    await printSession(username);
  }
);

const createVideoCommand = defineCommand(
  {
    args: {
      username: zArg(z.string(), { type: "positional" }),
    },
  },
  async ({ args: options }) => {
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
  }
);

const fetchCaptionEntriesCommand = defineCommand(
  {
    args: {
      videoId: z.string(),
      language1: z.string(),
      language2: z.string(),
      outFile: z.string(),
    },
  },
  async ({ args }) => {
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
);

// pnpm cli scrapeYoutube --videoId='-UroBRG1rY8'
const scrapeYoutube = defineCommand(
  {
    args: {
      videoId: z.string(),
      id: z.string().optional(),
      translation: z.string().optional(),
      outDir: z.string().default("./misc/youtube/data"),
    },
  },
  async ({ args }) => {
    const dir = `${args.outDir}/${args.videoId}`;
    await exec(`mkdir -p '${dir}'`);

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

    if (args.id) {
      await download(args.id, args.translation);
      return;
    }

    while (true) {
      const input = await consola.prompt(
        ":: please input language (+ translation) to download (e.g. .ko, .ko_en) >"
      );
      if (!input || typeof input !== "string") {
        break;
      }
      const [id, translation] = input.split("_");
      await download(id, translation);
    }

    async function download(id: string, translation?: string) {
      const url = captionConfigToUrl({ id, translation }, videoMetadata);
      tinyassert(url);
      const ttml = await fetch(url).then((res) => res.text());
      const name = [id, translation].filter(Boolean).join("_");
      const filepath = `${dir}/${name}.ttml`;
      console.log(`:: fetching ttml to '${filepath}'...`);
      await fs.promises.writeFile(filepath, ttml);
    }
  }
);

//
// seed export/import e.g.
//   pnpm cli dbSeedExport --deckId 1 --outFile misc/db/dev.json
//   pnpm cli dbSeedImport --username dev-import --inFile misc/db/dev.json
//

const dbSeedExport = defineCommand(
  {
    args: {
      deckId: z.coerce.number().int(),
      outFile: z.string(),
    },
  },
  async ({ args }) => {
    const data = await exportDeckJson(args.deckId);
    await fs.promises.writeFile(args.outFile, JSON.stringify(data, null, 2));
  }
);

const dbSeedImport = defineCommand(
  {
    args: {
      username: z.string(),
      inFile: z.string(),
    },
  },
  async ({ args }) => {
    const user = await findByUsername(args.username);
    tinyassert(user);
    const fileDataRaw = await fs.promises.readFile(args.inFile, "utf-8");
    await importDeckJson(user.id, JSON.parse(fileDataRaw));
  }
);

const cleanData = defineCommand(
  {
    args: {
      onlyUsername: zArg(z.string(), { type: "positional" }),
      deleteAnonymousVideos: zArg(z.coerce.boolean(), { type: "flag" }),
    },
  },
  async ({ args: { onlyUsername, deleteAnonymousVideos } }) => {
    // delete except `onlyUsername`
    await db.delete(T.users).where(E.not(E.eq(T.users.username, onlyUsername)));
    if (deleteAnonymousVideos) {
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

const resetCounterCache_videos_bookmarkEntriesCount = defineCommand(
  { args: {} },
  async () => {
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
  }
);

const resetCounterCache_practiceEntries_practiceActionsCount = defineCommand(
  { args: {} },
  async () => {
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
  }
);

const resetDeckCacheCommand = defineCommand(
  {
    args: {
      deckId: z.coerce.number().optional(),
    },
  },
  async ({ args }) => {
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
);

const debugCacheNextEntries = defineCommand(
  {
    args: {
      deckId: z.coerce.number(),
    },
  },
  async ({ args }) => {
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
);

const debugRandomMode = defineCommand(
  {
    args: {
      deckId: z.coerce.number().int(),
      count: z.coerce.number().default(10),
      seed: z.coerce.number().default(Date.now()),
    },
  },
  async ({ args }) => {
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
);

const fixBookmarkEntriesOffset = defineCommand(
  {
    args: {
      update: z.coerce.boolean(),
    },
  },
  async ({ args }) => {
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
);

//
// main
//

const tinyCli = defineSubCommands({
  program: "(cli)",
  autoHelp: true,
  commands: {
    dbTestMigrations,
    createUser,
    resetPassword,
    printSession: printSessionCommand,
    createVideo: createVideoCommand,
    scrapeYoutube,
    fetchCaptionEntries: fetchCaptionEntriesCommand,
    dbSeedExport,
    dbSeedImport,
    cleanData,
    resetCounterCache_videos_bookmarkEntriesCount,
    resetCounterCache_practiceEntries_practiceActionsCount,
    resetDeckCache: resetDeckCacheCommand,
    debugCacheNextEntries,
    debugRandomMode,
    fixBookmarkEntriesOffset,
  },
});

async function main() {
  try {
    await initializeServer();
    await tinyCli.parse(process.argv.slice(2));
  } catch (e) {
    consola.error(e);
    process.exit(1);
  } finally {
    await finalizeServer();
  }
}

main();

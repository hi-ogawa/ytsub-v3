import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { cac } from "cac";
import { range, zip } from "lodash";
import { client } from "../db/client.server";
import { tables } from "../db/models";
import { createUserCookie, register, verifySignin } from "../utils/auth";
import { exec } from "../utils/node.server";

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
  .action(clieDbTestMigrations);

async function clieDbTestMigrations(options: {
  showSchema: boolean;
  unitTest: boolean;
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

  assert.strict.deepEqual(ups, downs);
  console.error(":: success");

  await client.destroy();
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

async function printSession(username: string, password: string) {
  const user = await verifySignin({ username, password });
  const cookie = await createUserCookie(user);
  console.log(cookie);
}

if (require.main === module) {
  installGlobals();
  cli.parse();
}

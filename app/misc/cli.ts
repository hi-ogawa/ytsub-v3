import * as assert from "assert/strict";
import { installGlobals } from "@remix-run/node";
import { cac } from "cac";
import { range } from "lodash";
import { register, signinSession, verifySignin } from "../utils/auth";
import { commitSession, getSession } from "../utils/session.server";
import { client } from "../db/client.server";
import { users } from "../db/models";
import { exec } from "../utils/node.server";

const cli = cac("cli").help();

cli.command("db:truncate").action(async () => {
  await users().truncate();
  await client.destroy();
});

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

cli.command("db:test-migrations", "test reversibility").action(async () => {
  const [completed, pending] = (await client.migrate.list()) as [
    { name: string }[],
    { file: string }[]
  ];

  console.log(":: list completed");
  for (const { name } of completed) {
    console.log(name);
  }

  console.log(":: list pending");
  for (const { file } of pending) {
    console.log(file);
  }

  const ups = [];
  const downs = [];

  const getSchema_ = () =>
    getSchema({ showCreateTable: false, includeKnex: false });

  console.log(":: running migrations");

  ups.push(await getSchema_());
  for (const i of range(pending.length)) {
    console.log(`(⇑:${i + 1}/${pending.length}) ${pending[i].file}`);
    await exec("npx knex migrate:up");
    ups.push(await getSchema_());
  }

  downs.unshift(await getSchema_());
  for (const i of range(pending.length)) {
    console.log(`(⇓:${i + 1}/${pending.length}) ${pending.at(-i - 1)?.file}`);
    await exec("npx knex migrate:down");
    downs.unshift(await getSchema_());
  }

  assert.deepEqual(ups, downs);
  console.log(":: success");

  await client.destroy();
});

cli
  .command("create-user <username> <password>")
  .action(async (username: string, password: string) => {
    await register({ username, password });
    await printSession(username, password);
    await client.destroy();
  });

cli
  .command("print-session <username> <password>")
  .action(async (username: string, password: string) => {
    await printSession(username, password);
    await client.destroy();
  });

async function printSession(username: string, password: string) {
  const user = await verifySignin({ username, password });
  const session = await getSession();
  signinSession(session, user);
  const cookie = await commitSession(session);
  console.log(cookie);
}

if (require.main === module) {
  installGlobals();
  cli.parse();
}

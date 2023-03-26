import { Knex, knex } from "knex";
import knexfile from "./knexfile.server";

// Reuse connection on reload
// https://github.com/remix-run/remix/blob/7a4279a513fb38fdea5b49a3a6ffa24dfbafcf16/examples/jokes/app/utils/db.server.ts

export let client: Knex;

declare let globalThis: {
  __knexClient: any;
};

if (!globalThis.__knexClient) {
  globalThis.__knexClient = knex(knexfile());
}
client = globalThis.__knexClient;

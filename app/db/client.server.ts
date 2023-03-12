import { Knex, knex } from "knex";
import KNEX_CONFIG from "./knexfile.server";

// Reuse connection on reload
// https://github.com/remix-run/remix/blob/7a4279a513fb38fdea5b49a3a6ffa24dfbafcf16/examples/jokes/app/utils/db.server.ts

export let client: Knex;

declare global {
  var __DB_CLIENT__: any;
}

if (!global.__DB_CLIENT__) {
  global.__DB_CLIENT__ = knex(KNEX_CONFIG);
}
client = global.__DB_CLIENT__;

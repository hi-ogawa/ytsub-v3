import { once } from "@hiogawa/utils";
import { Knex, knex } from "knex";
import { uninitialized } from "../utils/misc";
import knexfile from "./knexfile.server";

// persist through dev auto reloading

declare let globalThis: {
  __knexClient: Knex;
};

export let client: typeof globalThis.__knexClient = uninitialized;

export const initializeKnexClient = once(() => {
  client = globalThis.__knexClient ??= inner();

  function inner() {
    return knex(knexfile());
  }
});

import { once } from "@hiogawa/utils";
import { Knex, knex } from "knex";
import { throwGetterProxy } from "../utils/misc";
import knexfile from "./knexfile.server";

// persist through dev auto reloading

declare let globalThis: {
  __knexClient: any;
};

export let client = throwGetterProxy as Knex;

export const initializeKnexClient = once(() => {
  client = globalThis.__knexClient ??= inner();

  function inner() {
    return knex(knexfile());
  }
});

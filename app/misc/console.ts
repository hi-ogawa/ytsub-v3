import { client } from "../db/client.server";
import { Q } from "../db/models";

Object.assign(global, {
  // node repl freezes when auto-completing prismClient
  // prismaClient,
  client,
  Q,
});

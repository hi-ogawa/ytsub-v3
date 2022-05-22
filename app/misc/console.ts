import { client } from "../db/client.server";
import { Q } from "../db/models";

Object.assign(global, {
  client,
  Q,
});

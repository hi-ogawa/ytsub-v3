import repl from "node:repl";
import { client } from "../db/client.server";
import { E, T, db } from "../db/drizzle-client.server";
import { Q } from "../db/models";
import { initializeServer } from "./initialize-server";

async function main() {
  await initializeServer();
  const replServer = repl.start();
  Object.assign(replServer.context, {
    client,
    Q,
    T,
    E,
    db,
  });
  replServer.on("exit", () => {
    process.exit(1);
  });
}

main();

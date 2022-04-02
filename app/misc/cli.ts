import { installGlobals } from "@remix-run/node";
import { cac } from "cac";
import { register, signinSession, verifySignin } from "../utils/auth";
import { commitSession, getSession } from "../utils/session.server";
import { client } from "../db/client.server";
import { users } from "../db/models";

const cli = cac("cli").help();

cli.command("truncate").action(async () => {
  await users().truncate();
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

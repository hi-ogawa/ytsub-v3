import { register } from "../utils/auth";
import { client } from "./client.server";

async function main() {
  await register({ username: "root", password: "pass" });
  await client.destroy();
}

if (require.main === module) {
  main();
}

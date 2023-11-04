import { $ } from "@hiogawa/utils-node";
import process from "node:process";
import readline from "node:readline";

/*
usage
node scripts/tunnel.mjs http://localhost:3000
*/

const $$ = $.new({
  stdio: ["ignore", "inherit", "inherit"],
});

const inputUrl = process.argv[2];
const logFile = await $`mktemp`;

// start tunnel
const tunnelProcess = $$`cloudflared tunnel --url ${inputUrl} --logfile ${logFile}`;

// delegate SIGINT
process.on("SIGINT", () => {
  process.kill(tunnelProcess.child.pid, "SIGINT");
});

// watch log to wait for tunnel url and show qrcode
const logTailProcess = $`tail +1f ${logFile}`;
const rl = readline.createInterface(logTailProcess.child.stdout);
for await (const line of rl) {
  const m = line.match(/https:\/\/.+.trycloudflare.com/);
  if (m) {
    const tunnelUrl = m[0];
    await $$`pnpm exec qrcode-rust-wasm-bindgen ${tunnelUrl}`;
    break;
  }
}
rl.close();

logTailProcess.promise.catch((e) => e); // silence unhandledRejection
process.kill(logTailProcess.child.pid);

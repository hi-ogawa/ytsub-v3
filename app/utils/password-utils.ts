import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { initWorker } from "@hiogawa/argon2-wasm-bindgen/dist/worker-node";

// argon2 password hashing
// https://github.com/bitwarden/clients/pull/4468
// https://github.com/bitwarden/server/pull/2583
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
// https://github.com/RustCrypto/password-hashes/blob/dc23aa160f010bcb02050ae230be868d84367c1d/argon2/README.md
// https://github.com/hi-ogawa/argon2-wasm-bindgen

let worker: Awaited<ReturnType<typeof initWorker>>;

export async function initializeArgon2() {
  worker = await initWorker();
  await worker.argon2.initBundle();
}

export async function finalizeArgon2() {
  if (worker) {
    await worker.worker.terminate();
  }
}

const randomBytesPromise = promisify(randomBytes);

async function generateSalt(): Promise<string> {
  const saltLength = 16;
  const saltBuffer = await randomBytesPromise(saltLength);
  return saltBuffer.toString("base64").replaceAll("=", "");
}

export async function toPasswordHash(password: string): Promise<string> {
  const salt = await generateSalt();
  return worker.argon2.hash_password(password, salt);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  // check old bcrypt hash and show specific message
  if (passwordHash.startsWith("$2a$")) {
    throw new Error(
      "Your password has been reset. Please create a new password from 'Forget your password'."
    );
  }

  return worker.argon2.verify_password(password, passwordHash);
}

import childProcess from "node:child_process";
import type { Readable } from "node:stream";
import { promisify } from "node:util";

export const exec = promisify(childProcess.exec);

// cf. https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_readable_symbol_asynciterator
export async function streamToString(readable: Readable): Promise<string> {
  readable.setEncoding("utf8");
  let res = "";
  for await (const chunk of readable) res += chunk;
  return res;
}

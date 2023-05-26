import type { Server } from "node:http";
import process from "node:process";
import { newPromiseWithResolvers, range } from "@hiogawa/utils";

export async function listenPortSearchByEnv(server: Server) {
  const initialPort = Number(process.env["PORT"] ?? 3000);
  const strictPort = Boolean(process.env["STRICT_PORT"]);
  return listenPortSearch(server, "localhost", initialPort, strictPort);
}

async function listenPortSearch(
  server: Server,
  host: string,
  initialPort: number,
  strictPort: boolean
) {
  for (const port of range(initialPort, 2 ** 16)) {
    if (port !== initialPort) {
      console.log(`[listenPortSearch] trying next port '${port}'`);
    }
    try {
      await listenPromise(server, host, port);
      return port;
    } catch (e) {
      if (
        !strictPort &&
        e instanceof Error &&
        (e as any).code === "EADDRINUSE"
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error(listenPortSearch.name);
}

async function listenPromise(
  server: Server,
  host: string,
  port: number
): Promise<void> {
  const { promise, resolve, reject } = newPromiseWithResolvers<void>();
  const onError = (e: unknown) => reject(e);
  server.on("error", onError);
  server.listen(port, host, () => resolve());
  try {
    await promise;
  } finally {
    server.off("error", onError);
  }
}

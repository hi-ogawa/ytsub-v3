import type { TT } from "../db/drizzle-client.server";
import { createUserCookie } from "../utils/auth";
import { createTrpcAppContext } from "./context";
import { trpcApp } from "./server";

export async function testTrpcClient(options?: { user?: TT["users"] }) {
  const req = new Request("http://example.com"); // dummy
  if (options?.user) {
    const cookie = await createUserCookie(options.user);
    req.headers.set("cookie", cookie);
  }
  const ctx = await createTrpcAppContext({
    req,
    resHeaders: new Response().headers,
  });
  return trpcApp.createCaller(ctx);
}

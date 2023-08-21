import { RequestHandler } from "@hattip/compose";
import {
  checkExpirationTime,
  jwsSign,
  jwsVerify,
  setExpirationTime,
} from "@hiogawa/tiny-jwt";
import { tinyassert, wrapErrorAsync } from "@hiogawa/utils";
import * as cookieLib from "cookie";
import { z } from "zod";
import { findUserById } from "../../utils/auth";
import { ctx_get } from "./storage";

const Z_SESSION_DATA = z.object({
  user: z
    .object({
      id: z.number(),
    })
    .optional(),
});

type SessionData = z.infer<typeof Z_SESSION_DATA>;

declare module "@hattip/compose" {
  interface RequestContextExtensions {
    session: SessionData;
  }
}

export function sessionHandler(): RequestHandler {
  return async (ctx) => {
    ctx.session = await readCookieSession(
      ctx.request.headers.get("cookie") ?? undefined
    );
    return ctx.next();
  };
}

//
// context helpers
//

export async function ctx_commitSession() {
  const ctx = ctx_get();
  ctx.responseHeaders.append(
    "set-cookie",
    await writeCookieSession(ctx.session)
  );
}

export async function ctx_currentUser() {
  const ctx = ctx_get();
  return ctx.session.user && (await findUserById(ctx.session.user.id));
}

export async function ctx_requireUser(message = "require user") {
  const user = await ctx_currentUser();
  tinyassert(user, message); // TODO: TinyRpcError
  return user;
}

export async function ctx_requireSignout(message = "Already signed in") {
  const user = await ctx_currentUser();
  tinyassert(!user, message);
}

//
// session by signed jwt on cookie
//

// npx tiny-jwt keygen HS256
const JWT_KEY = {
  kty: "oct",
  k: "UsahhkGSKhgcluJCHWdm2C96SLjxoEKwE8Lpn4CC9rImDC8DzDX30GG4fPimG_mgdlGDleguFEW7p-Qta46kew", // this should be runtime secret
};

const COOKIE_NAME = "__session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 14 * 24 * 60 * 60, // two weeks
} satisfies cookieLib.CookieSerializeOptions;

async function readCookieSession(cookie?: string): Promise<SessionData> {
  if (cookie) {
    const cookieRecord = cookieLib.parse(cookie);
    const token = cookieRecord[COOKIE_NAME];
    if (token) {
      const parsed = await wrapErrorAsync(async () => {
        const verified = await jwsVerify({
          token,
          key: JWT_KEY,
          algorithms: ["HS256"],
        });
        checkExpirationTime(verified.header);
        return Z_SESSION_DATA.parse(verified.payload);
      });
      if (parsed.ok) {
        return parsed.value;
      }
    }
  }
  return {};
}

// also used for testing and dev cli
export async function writeCookieSession(
  session: SessionData
): Promise<string> {
  const token = await jwsSign({
    header: { alg: "HS256", ...setExpirationTime(COOKIE_OPTIONS.maxAge) },
    payload: session,
    key: JWT_KEY,
  });
  const cookie = cookieLib.serialize(COOKIE_NAME, token, COOKIE_OPTIONS);
  tinyassert(cookie.length < 2 ** 12, "too large cookie session");
  return cookie;
}

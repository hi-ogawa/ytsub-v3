import * as process from "process";
import { once } from "@hiogawa/utils";
import { z } from "zod";
import { uninitialized } from "./misc";

//
// common
//

// prettier-ignore
const Z_SERVER_CONFIG = z.object({
  APP_MYSQL_HOST: z.string().default("localhost"),
  APP_MYSQL_PORT: z.coerce.number().default(3306),
  APP_MYSQL_USER: z.string().default("root"),
  APP_MYSQL_PASSWORD: z.string().default("password"),
  APP_MYSQL_DATABASE: z.string().default(process.env.NODE_ENV === "test" ? "ytsub_test" : "ytsub_development"),
  APP_MYSQL_SSL: z.coerce.boolean(),

  APP_SESSION_SECRET: z.string().default("__sessionSecret"),
  // TODO: even for dev localhost, let's not expose server key?
  APP_RECAPTCHA_SERVER_KEY: z.string().default("6Lc79AcgAAAAAMGT4kicuJ9Mbq8JuRWy6xRwHDHS"),
});

// prettier-ignore
const Z_PUBLIC_CONFIG = z.object({
  APP_RECAPTCHA_CLIENT_KEY: z.string().default("6Lc79AcgAAAAAOdPnmAZfQqhVwL7mJngRndTyG19"),
  APP_RECAPTCHA_DISABLED: z.coerce.boolean(),
  APP_SENTRY_DSN: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
});

// prettier-ignore
const Z_BUILD_CONFIG = z.object({
  // build time constants injected via esbuild "define" options
  GIT_COMMIT_REF: z.string().optional(),
});

export let serverConfig = uninitialized as z.infer<typeof Z_SERVER_CONFIG>;

export let publicConfig = uninitialized as z.infer<typeof Z_PUBLIC_CONFIG>;

export let buildConfig = uninitialized as z.infer<typeof Z_BUILD_CONFIG>;

export const CONFIG_SCRIPT_PLACEHOLDER = "/*@@INJECT_CONFIG_SCRIPT@@*/";

//
// server
//

export const initializeConfigServer = once(() => {
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  publicConfig = Z_PUBLIC_CONFIG.parse(process.env);
  // esbuild injects BUILD_CONFIG_DEFINE on release build
  buildConfig = Z_BUILD_CONFIG.parse(process.env.BUILD_CONFIG_DEFINE ?? {});
});

// pass data to client via global script
declare let __publicConfig: any;
declare let __buildConfig: any;

export function injectConfigScript(markup: string): string {
  // TODO: need to escape?
  const code = `
globalThis.__publicConfig = ${JSON.stringify(publicConfig)};
globalThis.__buildConfig = ${JSON.stringify(buildConfig)};
`;
  return markup.replace(CONFIG_SCRIPT_PLACEHOLDER, code);
}

//
// client
//

export const initializeConfigClient = once(() => {
  publicConfig = __publicConfig;
  buildConfig = __buildConfig;
});

import * as process from "process";
import { once, tinyassert } from "@hiogawa/utils";
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
  VERCEL_ENV: z.string().optional(),
});

export let serverConfig = uninitialized as z.infer<typeof Z_SERVER_CONFIG>;

export let publicConfig = uninitialized as z.infer<typeof Z_PUBLIC_CONFIG>;

export const CONFIG_SCRIPT_ID = "__configScript";

export const CONFIG_SCRIPT_PLACEHOLDER = "@@__configScriptPlaceholder@@";

//
// server
//

export const initializeConfigServer = once(() => {
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  publicConfig = Z_PUBLIC_CONFIG.parse(process.env);
});

export function injectConfigScript(markup: string): string {
  return markup.replace(
    CONFIG_SCRIPT_PLACEHOLDER,
    JSON.stringify(publicConfig)
  );
}

//
// client
//

export const initializeConfigClient = once(() => {
  const el = document.querySelector("#" + CONFIG_SCRIPT_ID);
  tinyassert(el);
  publicConfig = JSON.parse(el.innerHTML);
});

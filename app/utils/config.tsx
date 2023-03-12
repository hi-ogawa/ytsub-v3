import * as process from "process";
import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { throwGetterProxy } from "./misc";

//
// common
//

// prettier-ignore
export const Z_SERVER_CONFIG = z.object({
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
export const Z_PUBLIC_CONFIG = z.object({
  APP_RECAPTCHA_CLIENT_KEY: z.string().default("6Lc79AcgAAAAAOdPnmAZfQqhVwL7mJngRndTyG19"),
  APP_RECAPTCHA_DISABLED: z.coerce.boolean(),
  VERCEL_ENV: z.string().optional(),
});

export let serverConfig: z.infer<typeof Z_SERVER_CONFIG> =
  throwGetterProxy as any;

export let publicConfig: z.infer<typeof Z_PUBLIC_CONFIG> =
  throwGetterProxy as any;

const CONFIG_SCRIPT_ID = "__configScript";
const CONFIG_SCRIPT_PLACEHOLDER = "@@__configScriptPlaceholder@@";

// modified by server (injectConfigScript)
// read by client (initializeConfigClient)
export function ConfigScriptPlaceholder() {
  return (
    <script
      id={CONFIG_SCRIPT_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: CONFIG_SCRIPT_PLACEHOLDER }}
      suppressHydrationWarning
    />
  );
}

//
// server
//

export function initializeConfigServer() {
  if (serverConfig !== throwGetterProxy) {
    return;
  }
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  publicConfig = Z_PUBLIC_CONFIG.parse(process.env);
}

export function injectConfigScript(markup: string): string {
  return markup.replace(
    CONFIG_SCRIPT_PLACEHOLDER,
    JSON.stringify(publicConfig)
  );
}

//
// client
//

export function initializeConfigClient() {
  if (publicConfig !== throwGetterProxy) {
    return;
  }
  const el = document.querySelector("#" + CONFIG_SCRIPT_ID);
  tinyassert(el);
  publicConfig = JSON.parse(el.innerHTML);
}

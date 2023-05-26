import * as process from "process";
import { once } from "@hiogawa/utils";
import { z } from "zod";
import { initializePublicConfigServer } from "./config-public";
import { uninitialized } from "./misc";

// prettier-ignore
const Z_SERVER_CONFIG = z.object({
  APP_MYSQL_HOST: z.string().default("localhost"),
  APP_MYSQL_PORT: z.coerce.number().default(3306),
  APP_MYSQL_USER: z.string().default("root"),
  APP_MYSQL_PASSWORD: z.string().default("password"),
  APP_MYSQL_DATABASE: z.string().default(process.env.NODE_ENV === "test" ? "ytsub_test" : "ytsub_development"),
  APP_MYSQL_SSL: z.coerce.boolean(),

  APP_SESSION_SECRET: z.string().default("__sessionSecret"),

  // captcha (default test keys always succeed https://developers.cloudflare.com/turnstile/reference/testing/)
  APP_CAPTCHA_SITE_KEY: z.string().default("1x00000000000000000000BB"),
  APP_CAPTCHA_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),

  VERCEL_ENV: z.string().optional(),
});

const Z_PUBLIC_CONFIG = Z_SERVER_CONFIG.pick({
  APP_CAPTCHA_SITE_KEY: true,
  VERCEL_ENV: true,
});

export type PublicConfig = z.infer<typeof Z_PUBLIC_CONFIG>;

export let serverConfig = uninitialized as z.infer<typeof Z_SERVER_CONFIG>;

export const initializeConfigServer = once(() => {
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  initializePublicConfigServer(Z_PUBLIC_CONFIG.parse(process.env));
});

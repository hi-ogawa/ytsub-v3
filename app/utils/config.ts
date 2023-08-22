import * as process from "process";
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

  // npx tiny-jwt keygen HS256
  APP_SESSION_SECRET: z.string().default("MPImXuGdAboqKBkWnx1Ixc41XY4esDWL4BJWgPQc4ESCcyQBmWsuH2ZsWlOZrBQ45D21J3g-GupjzgT3lhqaRw"),

  // captcha (default test keys always succeed https://developers.cloudflare.com/turnstile/reference/testing/)
  APP_CAPTCHA_SITE_KEY: z.string().default("1x00000000000000000000BB"),
  APP_CAPTCHA_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),

  // mailjet
  MJ_APIKEY_PUBLIC: z.string().optional(),
  MJ_APIKEY_PRIVATE: z.string().optional(),

  // used for email link
  BASE_URL: z.string().default("https://ytsub-v3-hiro18181.vercel.app"),

  VERCEL_ENV: z.string().optional(),
});

const Z_PUBLIC_CONFIG = Z_SERVER_CONFIG.pick({
  APP_CAPTCHA_SITE_KEY: true,
  VERCEL_ENV: true,
});

export type PublicConfig = z.infer<typeof Z_PUBLIC_CONFIG>;

export let serverConfig = uninitialized as z.infer<typeof Z_SERVER_CONFIG>;

export function initializeConfigServer() {
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  initializePublicConfigServer(Z_PUBLIC_CONFIG.parse(process.env));
}

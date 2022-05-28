// prettier-ignore
export const SECRET = {
  APP_SESSION_SECRET: process.env.APP_SESSION_SECRET ?? "__secret__",
  APP_RECAPTCHA_SERVER_KEY: process.env.APP_RECAPTCHA_SERVER_KEY ?? "6Lc79AcgAAAAAMGT4kicuJ9Mbq8JuRWy6xRwHDHS",
};

// prettier-ignore
export const PUBLIC = {
  APP_RECAPTCHA_CLIENT_KEY: process.env.APP_RECAPTCHA_CLIENT_KEY ?? "6Lc79AcgAAAAAOdPnmAZfQqhVwL7mJngRndTyG19",
  APP_RECAPTCHA_DISABLED: process.env.APP_RECAPTCHA_DISABLED ?? "",
  APP_STAGING: process.env.VERCEL_ENV === "preview",
};

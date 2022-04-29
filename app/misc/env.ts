export const env = {
  // APP_SESSION_SECRET: process.env.APP_SESSION_SECRET ?? "__secret__",
  // @ts-ignore
  APP_SESSION_SECRET: Deno.env.get("APP_SESSION_SECRET") ?? "__secret__",
};

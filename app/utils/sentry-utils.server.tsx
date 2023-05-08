import { init } from "@sentry/node";
import { publicConfig } from "./config";

export function initializeSentryServer() {
  init({
    dsn: publicConfig.APP_SENTRY_DSN,
    environment: `${publicConfig.VERCEL_ENV ?? "local"}-server`,
    release: "local",
    // integrations: [],
  });
}

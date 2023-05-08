import { init } from "@sentry/browser";
import { publicConfig } from "./config";

export function initializeSentryBrowser() {
  init({
    dsn: publicConfig.APP_SENTRY_DSN,
    environment: `${publicConfig.VERCEL_ENV ?? "local"}-client`,
    release: "local",
    // integrations: [],
  });
}

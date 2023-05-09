import { init } from "@sentry/node";
import { publicConfig } from "./config";

// cf. default integration
// https://github.com/getsentry/sentry-javascript/blob/b624bff35854ea0497f0ea07425719723a73a79b/packages/browser/src/sdk.ts#L26-L35

export function initializeSentryServer() {
  init({
    dsn: publicConfig.APP_SENTRY_DSN,
    environment: `${publicConfig.VERCEL_ENV ?? "local"}-server`,
    release: "local",
  });
}

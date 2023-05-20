import { init } from "@sentry/browser";
import { buildConfig, publicConfig } from "./config";

// cf. default integrations
// https://github.com/getsentry/sentry-javascript/blob/b624bff35854ea0497f0ea07425719723a73a79b/packages/node/src/sdk.ts#L38-L57

export function initializeSentryBrowser() {
  init({
    dsn: publicConfig.APP_SENTRY_DSN,
    environment: `${publicConfig.VERCEL_ENV ?? "local"}-client`,
    release: buildConfig.GIT_COMMIT_REF ?? "local",
  });
}

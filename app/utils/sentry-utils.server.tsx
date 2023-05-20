import { CaptureConsole } from "@sentry/integrations";
import { init } from "@sentry/node";
import { buildConfig, publicConfig } from "./config";

// cf. default integration
// https://github.com/getsentry/sentry-javascript/blob/b624bff35854ea0497f0ea07425719723a73a79b/packages/browser/src/sdk.ts#L26-L35

export function initializeSentryServer() {
  init({
    dsn: publicConfig.APP_SENTRY_DSN,
    environment: `${publicConfig.VERCEL_ENV ?? "local"}-server`,
    release: buildConfig.GIT_COMMIT_REF ?? "local",
    // auto report console.error e.g.
    // - trpc error in app/routes/trpc/$trpc.tsx
    // - remix loader/ssr error https://github.com/remix-run/remix/blob/410e9d8aac044b3453c1dddbeb0bcc1d53cdec68/packages/remix-server-runtime/server.ts#L169
    integrations: [new CaptureConsole()],
  });
}

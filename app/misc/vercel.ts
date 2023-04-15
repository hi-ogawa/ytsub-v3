import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/vercel";

// TODO: @remix-run/vercel is deprecated https://github.com/remix-run/remix/pull/5964

export default createRequestHandler({ build });

import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/netlify";

export const handler = createRequestHandler({ build });

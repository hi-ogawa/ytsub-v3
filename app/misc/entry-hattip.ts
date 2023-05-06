import type { HattipHandler } from "@hattip/core";
import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/server-runtime";

const remixHandler = createRequestHandler(build);

const hattipHandler: HattipHandler = (context) => {
  return remixHandler(context.request);
};

export default hattipHandler;

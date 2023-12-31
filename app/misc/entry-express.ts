import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import { createHattipEntry } from "#misc/entry-hattip";

export default createMiddleware(createHattipEntry(), {
  alwaysCallNext: false, // avoid calling remix handler
  trustProxy: !import.meta.env.DEV,
});

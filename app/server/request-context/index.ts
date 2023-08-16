import { responseHeadersContextHandler } from "./response-headers";
import { sessionHandler } from "./session";
import { requestContextStorageHandler } from "./storage";

export function requestContextHandler() {
  return [
    requestContextStorageHandler(),
    responseHeadersContextHandler(),
    sessionHandler(),
  ];
}

import { responseHeadersContextHandler } from "./response-headers";
import { requestContextStorageHandler } from "./storage";

export function requestContextHandler() {
  return [requestContextStorageHandler(), responseHeadersContextHandler()];
}

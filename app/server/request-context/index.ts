import { routeParamsContextHandler } from "#server/request-context/loader";
import { responseHeadersContextHandler } from "#server/request-context/response-headers";
import { sessionHandler } from "#server/request-context/session";
import { requestContextStorageHandler } from "#server/request-context/storage";

export function requestContextHandler() {
  return [
    requestContextStorageHandler(),
    responseHeadersContextHandler(),
    routeParamsContextHandler(),
    sessionHandler(),
  ];
}

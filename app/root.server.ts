import { ctx_currentUser } from "./server/request-context/session";
import { RootLoaderData } from "./utils/loader-utils";
import { wrapLoader } from "./utils/loader-utils.server";

export const loader = wrapLoader(async () => {
  const loaderData: RootLoaderData = {
    currentUser: await ctx_currentUser(),
  };
  return loaderData;
});

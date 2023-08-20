import { ctx_currentUser } from "./server/request-context/session";
import { RootLoaderData } from "./utils/loader-utils";
import { makeLoader } from "./utils/loader-utils.server";

export const loader = makeLoader(async () => {
  const loaderData: RootLoaderData = {
    currentUser: await ctx_currentUser(),
  };
  return loaderData;
});

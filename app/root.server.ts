import { TT } from "./db/drizzle-client.server";
import { ctx_currentUser } from "./server/request-context/session";
import { wrapLoader } from "./utils/loader-utils.server";

export type LoaderData = {
  currentUser?: TT["users"];
};

export const loader = wrapLoader(async () => {
  const loaderData: LoaderData = {
    currentUser: await ctx_currentUser(),
  };
  return loaderData;
});

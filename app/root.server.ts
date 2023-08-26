import { TT } from "./db/drizzle-client.server";
import { ctx_currentUser } from "./server/request-context/session";

export type LoaderData = {
  currentUser?: TT["users"];
};

export const loader = async () => {
  const loaderData: LoaderData = {
    currentUser: await ctx_currentUser(),
  };
  return loaderData;
};

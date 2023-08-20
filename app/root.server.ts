import { RootLoaderData } from "./utils/loader-utils";
import { makeLoader } from "./utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const loaderData: RootLoaderData = {
    currentUser: await ctx.currentUser(),
  };
  return loaderData;
});

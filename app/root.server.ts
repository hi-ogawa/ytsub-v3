import { ShouldRevalidateFunction } from "@remix-run/react";
import { RootLoaderData } from "./utils/loader-utils";
import { makeLoader } from "./utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const loaderData: RootLoaderData = {
    currentUser: await ctx.currentUser(),
  };
  return loaderData;
});

// no need to revalidate `currentUser` since app refreshes on user session change (signin/signout)
export const shouldRevalidate: ShouldRevalidateFunction = () => false;

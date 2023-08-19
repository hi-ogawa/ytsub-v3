import { disableUrlQueryRevalidation } from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  await ctx.requireUser();
  return null;
});

export const shouldRevalidate = disableUrlQueryRevalidation;

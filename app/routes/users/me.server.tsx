import { makeLoader } from "../../utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const user = await ctx.requireUser();
  return user;
});

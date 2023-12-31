import { ctx_requireUserOrRedirect } from "#utils/loader-utils.server";

export const loader = async () => {
  await ctx_requireUserOrRedirect();
  return null;
};

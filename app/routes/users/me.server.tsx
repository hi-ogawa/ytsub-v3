import { ctx_requireUserOrRedirect } from "../../utils/loader-utils.server";

export const loader = async () => {
  const user = await ctx_requireUserOrRedirect();
  return user;
};

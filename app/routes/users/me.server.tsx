import {
  ctx_requireUserOrRedirect,
  wrapLoader,
} from "../../utils/loader-utils.server";

export const loader = wrapLoader(async () => {
  await ctx_requireUserOrRedirect();
  return null;
});

import {
  ctx_requireUserOrRedirect,
  wrapLoader,
} from "#utils/loader-utils.server";

export const loader = wrapLoader(async () => {
  const user = await ctx_requireUserOrRedirect();
  return user;
});

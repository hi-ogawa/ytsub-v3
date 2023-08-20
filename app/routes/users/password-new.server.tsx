import { ROUTE_DEF } from "../../misc/routes";
import { makeLoader } from "../../utils/loader-utils.server";

export type LoaderData = { code: string };

export const loader = makeLoader(async ({ ctx }) => {
  // only check the existence
  const { code } = ROUTE_DEF["/users/password-new"].query.parse(ctx.query);
  return { code } satisfies LoaderData;
});

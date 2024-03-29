import { ROUTE_DEF } from "../../misc/routes";
import { ctx_get } from "../../server/request-context/storage";
import { wrapLoader } from "../../utils/loader-utils.server";

export type LoaderData = { code: string };

export const loader = wrapLoader(async () => {
  // only check the existence
  const { code } = ROUTE_DEF["/users/password-new"].query.parse(
    ctx_get().urlQuery
  );
  return { code } satisfies LoaderData;
});

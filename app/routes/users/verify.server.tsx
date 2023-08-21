import { redirect } from "@remix-run/server-runtime";
import { R, ROUTE_DEF } from "../../misc/routes";
import { ctx_currentUser } from "../../server/request-context/session";
import { ctx_get } from "../../server/request-context/storage";
import { updateEmailByCode } from "../../trpc/routes/users";
import { encodeFlashMessage } from "../../utils/flash-message";
import { wrapLoader } from "../../utils/loader-utils.server";

export const loader = wrapLoader(async () => {
  const { code } = ROUTE_DEF["/users/verify"].query.parse(ctx_get().urlQuery);
  await updateEmailByCode(code);
  const user = await ctx_currentUser();
  const url = user ? R["/users/me"] : R["/users/signin"];
  return redirect(
    url +
      "?" +
      encodeFlashMessage({
        variant: "success",
        content: `Successfully updated an email`,
      })
  );
});

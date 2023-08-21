import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import { ctx_currentUser } from "../../server/request-context/session";
import { encodeFlashMessage } from "../../utils/flash-message";
import { wrapLoader } from "../../utils/loader-utils.server";

export const loader = wrapLoader(async () => {
  const user = await ctx_currentUser();
  if (user) {
    return redirect(
      R["/users/me"] +
        "?" +
        encodeFlashMessage({
          content: `Already signed in as '${user.username}'`,
          variant: "error",
        })
    );
  }
  return null;
});

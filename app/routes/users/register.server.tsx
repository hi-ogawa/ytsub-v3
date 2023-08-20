import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import { encodeFlashMessage } from "../../utils/flash-message";
import { makeLoader } from "../../utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const user = await ctx.currentUser();
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

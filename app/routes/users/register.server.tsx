import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import { ctx_currentUser } from "../../server/request-context/session";
import { ctx_setFlashMessage } from "../../utils/flash-message.server";

export const loader = async () => {
  const user = await ctx_currentUser();
  if (user) {
    ctx_setFlashMessage({
      content: `Already signed in as '${user.username}'`,
      variant: "error",
    });
    throw redirect(R["/users/me"]);
  }
  return null;
};

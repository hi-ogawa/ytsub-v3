import { ActionFunction, redirect } from "@remix-run/server-runtime";
import { getSessionUser, signoutSession } from "../../utils/auth";
import {
  pushFlashMessage,
  withRequestSession,
} from "../../utils/session-utils";

export const action: ActionFunction = withRequestSession(
  async ({ session }) => {
    if (!(await getSessionUser(session))) {
      return { message: "Invalid sign out" };
    }
    signoutSession(session);
    pushFlashMessage(session, {
      content: "Signed out successfuly",
      variant: "success",
    });
    return redirect("/");
  }
);

import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import { signoutSession } from "../../utils/auth";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { pushFlashMessage } from "../../utils/flash-message";

export const loader = () => redirect(R["/"]);

export const action = makeLoader(Controller, async function () {
  if (!(await this.currentUser())) {
    pushFlashMessage(this.session, {
      content: "Not signed in",
      variant: "error",
    });
    return redirect(R["/"]);
  }
  signoutSession(this.session);
  pushFlashMessage(this.session, {
    content: "Signed out successfuly",
    variant: "success",
  });
  return redirect(R["/"]);
});

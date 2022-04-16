import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import { signoutSession } from "../../utils/auth";
import { Controller, makeLoader } from "../../utils/controller-utils";

export const loader = () => redirect(R["/"]);

export const action = makeLoader(Controller, async function () {
  if (!(await this.currentUser())) {
    this.flash({
      content: "Not signed in",
      variant: "error",
    });
    return redirect(R["/"]);
  }
  signoutSession(this.session);
  this.flash({
    content: "Signed out successfuly",
    variant: "success",
  });
  return redirect(R["/"]);
});

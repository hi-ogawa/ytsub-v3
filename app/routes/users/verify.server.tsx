import { json, redirect } from "@remix-run/server-runtime";
import { R, ROUTE_DEF } from "../../misc/routes";
import { ctx_currentUser } from "../../server/request-context/session";
import { ctx_get } from "../../server/request-context/storage";
import { updateEmailByCode } from "../../trpc/routes/users";
import { ctx_setFlashMessage } from "../../utils/flash-message.server";
import { unwrapZodResultOrRespond } from "../../utils/loader-utils.server";

export const loader = async () => {
  const { code } = unwrapZodResultOrRespond(
    ROUTE_DEF["/users/verify"].query.safeParse(ctx_get().urlQuery)
  );
  const success = await updateEmailByCode(code);
  if (!success) {
    throw json({ message: "invalid email verification link" }, { status: 400 });
  }
  const user = await ctx_currentUser();
  const url = user ? R["/users/me"] : R["/users/signin"];
  ctx_setFlashMessage({
    variant: "success",
    content: `Successfully updated an email`,
  });
  return redirect(url);
};

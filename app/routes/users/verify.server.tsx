import { redirect } from "@remix-run/server-runtime";
import { R, ROUTE_DEF } from "../../misc/routes";
import { updateEmailByCode } from "../../trpc/routes/users";
import { encodeFlashMessage } from "../../utils/flash-message";
import { makeLoader } from "../../utils/loader-utils.server";

export const loader = makeLoader(async ({ ctx }) => {
  const { code } = ROUTE_DEF["/users/verify"].query.parse(ctx.query);
  await updateEmailByCode(code);
  const user = await ctx.currentUser();
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

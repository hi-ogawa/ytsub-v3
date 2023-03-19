import { Form, Link, useActionData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { R } from "../../misc/routes";
import {
  PASSWORD_MAX_LENGTH,
  SIGNIN_SCHEMA,
  USERNAME_MAX_LENGTH,
  getSessionUser,
  signinSession,
  verifySignin,
} from "../../utils/auth";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { useIsFormValid } from "../../utils/hooks";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Sign in",
};

export const loader = makeLoader(Controller, async function () {
  const user = await getSessionUser(this.session);
  if (user) {
    this.flash({
      content: `Already signed in as '${user.username}'`,
      variant: "error",
    });
    return redirect(R["/users/me"]);
  }
  return null;
});

export const action = makeLoader(Controller, async function () {
  const parsed = SIGNIN_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { success: false, message: "Invalid sign in" };
  }

  try {
    const user = await verifySignin(parsed.data);
    signinSession(this.session, user);
    this.flash({
      content: `Successfully signed in as '${user.username}'`,
      variant: "success",
    });
    return redirect(R["/"]);
  } catch (e) {
    if (e instanceof AppError) {
      return { success: false, message: e.message };
    }
    throw e;
  }
});

export default function DefaultComponent() {
  const actionData: { message: string } | undefined = useActionData();
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="signin-form"
        {...formProps}
      >
        {actionData?.message && (
          <div className="text-colorError">
            <div>Error: {actionData.message}</div>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span>Username</span>
          <input
            type="text"
            name="username"
            className="antd-input"
            required
            maxLength={USERNAME_MAX_LENGTH}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            name="password"
            className="antd-input"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </label>
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            className="antd-btn antd-btn-primary"
            disabled={!isValid}
          >
            Sign in
          </button>
          <div className="text-sm text-colorTextSecondary">
            Don't have an account yet?{" "}
            <Link to={R["/users/register"]} className="antd-link">
              Register
            </Link>
          </div>
        </div>
      </Form>
    </div>
  );
}

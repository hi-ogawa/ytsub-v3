import { Form, Link, useActionData } from "@remix-run/react";
import { ActionFunction, redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { R } from "../../misc/routes";
import {
  PASSWORD_MAX_LENGTH,
  SIGNIN_SCHEMA,
  USERNAME_MAX_LENGTH,
  getSessionUser,
  signinSession,
  verifySignin,
} from "../../utils/auth";
import { AppError } from "../../utils/errors";
import { useIsFormValid } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import {
  pushFlashMessage,
  withRequestSession,
} from "../../utils/session-utils";
import { fromRequestForm } from "../../utils/url-data";

export const handle: PageHandle = {
  navBarTitle: "Sign in",
};

export const loader: ActionFunction = withRequestSession(
  async ({ session }) => {
    // TOOD: generalize this routine (for "/users/register" too)
    const user = await getSessionUser(session);
    if (user) {
      pushFlashMessage(session, {
        content: `Already logged in as ${user.username}`,
        variant: "error",
      });
      return redirect(R["/users/me"]);
    }
    return null;
  }
);

export const action: ActionFunction = withRequestSession(
  async ({ request, session }) => {
    const parsed = SIGNIN_SCHEMA.safeParse(await fromRequestForm(request));
    if (!parsed.success) {
      return { success: false, message: "Invalid sign in" };
    }

    try {
      const user = await verifySignin(parsed.data);
      signinSession(session, user);
      return redirect(R["/"]);
    } catch (e) {
      if (e instanceof AppError) {
        return { success: false, message: e.message };
      }
      throw e;
    }
  }
);

export default function DefaultComponent() {
  const actionData: { message: string } | undefined = useActionData();
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="card border w-80 p-4 px-6"
        data-test="signin-form"
        {...formProps}
      >
        {actionData?.message ? (
          <div className="alert alert-error text-white text-sm">
            <div>Error: {actionData.message}</div>
          </div>
        ) : null}
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            name="username"
            className="input input-bordered"
            required
            maxLength={USERNAME_MAX_LENGTH}
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            name="password"
            className="input input-bordered"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Sign in
          </button>
          <label className="label">
            <div className="label-text text-xs text-gray-400">
              Don't have an account yet?{" "}
              <Link to={R["/users/register"]} className="link link-primary">
                Register
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

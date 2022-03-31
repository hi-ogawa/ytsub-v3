import * as React from "react";
import { Form, Link, useActionData } from "@remix-run/react";
import { ActionFunction, redirect } from "@remix-run/server-runtime";
import { useIsFormValid } from "../../utils/hooks";
import { fromRequestForm } from "../../utils/url-data";
import { AppError } from "../../utils/errors";
import {
  PASSWORD_MAX_LENGTH,
  SIGNIN_SCHEMA,
  USERNAME_MAX_LENGTH,
  getSessionUser,
  signinSession,
  verifySignin,
} from "../../utils/auth";
import { withRequestSession } from "../../utils/session-utils";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "Sign in",
};

export const loader: ActionFunction = withRequestSession(
  async ({ session }) => {
    const user = await getSessionUser(session);
    if (user) {
      session.flash("message", `Already logged in as ${user.username}`);
      return redirect("/users/me");
    }
    return null;
  }
);

export const action: ActionFunction = withRequestSession(
  async ({ request, session }) => {
    if (await getSessionUser(session)) {
      // TODO: "Already logged in" snackbar
      return redirect("/");
    }

    const parsed = SIGNIN_SCHEMA.safeParse(await fromRequestForm(request));
    if (!parsed.success) {
      return { success: false, message: "Invalid sign in" };
    }

    try {
      const user = await verifySignin(parsed.data);
      signinSession(session, user);
      return redirect("/");
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
      <Form method="post" className="card border w-80 p-4 px-6" {...formProps}>
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
              <Link to="/users/register" className="link link-primary">
                Register
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

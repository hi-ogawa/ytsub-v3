import { Form, Link, useActionData } from "@remix-run/react";
import { ActionFunction, redirect } from "@remix-run/server-runtime";
import * as React from "react";
import {
  PASSWORD_MAX_LENGTH,
  REGISTER_SCHEMA,
  USERNAME_MAX_LENGTH,
  getSessionUser,
  register,
  signinSession,
} from "../../utils/auth";
import { AppError } from "../../utils/errors";
import { useIsFormValid } from "../../utils/hooks";
import { mapOption } from "../../utils/misc";
import { PageHandle } from "../../utils/page-handle";
import { withRequestSession } from "../../utils/session-utils";
import { fromRequestForm } from "../../utils/url-data";

export const handle: PageHandle = {
  navBarTitle: "Register",
};

export const loader: ActionFunction = withRequestSession(
  async ({ session }) => {
    if (await getSessionUser(session)) {
      // TODO: "Already logged in" snackbar
      return redirect("/");
    }
    return null;
  }
);

interface ActionData {
  message: string;
  errors?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

export const action: ActionFunction = withRequestSession(
  async ({ request, session }) => {
    const parsed = REGISTER_SCHEMA.safeParse(await fromRequestForm(request));
    if (!parsed.success) {
      return {
        message: "Invalid registration",
        errors: parsed.error.flatten(),
      };
    }
    try {
      const user = await register(parsed.data);
      signinSession(session, user);
      return redirect("/");
    } catch (e) {
      if (e instanceof AppError) {
        return { message: e.message };
      }
      throw e;
    }
  }
);

export default function DefaultComponent() {
  const actionData: ActionData | undefined = useActionData();
  const [isValid, formProps] = useIsFormValid();

  const errors = mapOption(actionData?.errors?.fieldErrors, Object.keys) ?? [];

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="card border w-80 p-4 px-6"
        data-test="register-form"
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
            className={`input input-bordered ${
              errors.includes("username") && "input-error"
            }`}
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
            className={`input input-bordered ${
              errors.includes("password") && "input-error"
            }`}
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password confirmation</span>
          </label>
          <input
            type="password"
            name="passwordConfirmation"
            className={`input input-bordered ${
              errors.includes("passwordConfirmation") && "input-error"
            }`}
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Register
          </button>
          <label className="label">
            <div className="label-text text-xs text-gray-400">
              Already have an account?{" "}
              <Link to="/users/signin" className="link link-primary">
                Sign in
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

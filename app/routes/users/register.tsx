import { Form, Link, useActionData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { assert } from "../../misc/assert";
import { PUBLIC, SECRET } from "../../misc/env.server";
import { R } from "../../misc/routes";
import {
  PASSWORD_MAX_LENGTH,
  REGISTER_SCHEMA,
  USERNAME_MAX_LENGTH,
  register,
  signinSession,
} from "../../utils/auth";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { createUseQuery, useIsFormValid } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import { mapOption } from "../../utils/misc";
import { PageHandle } from "../../utils/page-handle";
import { loadScriptMemoized } from "../../utils/script";
import { toForm } from "../../utils/url-data";

export const handle: PageHandle = {
  navBarTitle: () => "Register",
};

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (user) {
    this.flash({
      content: `Already signed in as '${user.username}'`,
      variant: "error",
    });
    return redirect(R["/users/me"]);
  }
  return null;
});

interface ActionData {
  message: string;
  errors?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

async function verifyRecaptchaToken(token: string): Promise<boolean> {
  // for loader unit tests
  if (PUBLIC.APP_RECAPTCHA_DISABLED) {
    return true;
  }

  // https://developers.google.com/recaptcha/docs/verify
  const url = "https://www.google.com/recaptcha/api/siteverify";
  const payload = {
    secret: SECRET.APP_RECAPTCHA_SERVER_KEY,
    response: token,
  };
  const res = await fetch(url, {
    method: "POST",
    body: toForm(payload),
  });
  if (!res.ok) {
    return false;
  }

  // https://developers.google.com/recaptcha/docs/v3#site_verify_response
  interface VerifyResponse {
    success: boolean;
    score: number; // [0, 1]
  }
  const resJson: VerifyResponse = await res.json();
  const ok = resJson.success && resJson.score >= 0.5;
  if (!ok) {
    console.error("verifyRecaptchaToken", resJson);
  }
  return ok;
}

export const action = makeLoader(Controller, async function () {
  const parsed = REGISTER_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return {
      message: "Invalid registration",
      errors: parsed.error.flatten(),
    };
  }

  // verify recaptcha
  const recaptchaOk = await verifyRecaptchaToken(parsed.data.recaptchaToken);
  if (!recaptchaOk) {
    return { message: "Invalid reCAPTCHA" };
  }

  try {
    const user = await register(parsed.data);
    signinSession(this.session, user);
    this.flash({ content: "Successfully registered", variant: "success" });
    return redirect(R["/"]);
  } catch (e) {
    if (e instanceof AppError) {
      return { message: e.message };
    }
    throw e;
  }
});

export default function DefaultComponent() {
  const {
    PUBLIC: { APP_RECAPTCHA_CLIENT_KEY, APP_RECAPTCHA_DISABLED },
  } = useRootLoaderData();
  const actionData: ActionData | undefined = useActionData();
  const [isValid, formProps] = useIsFormValid();
  const recaptchaApi = useRecaptchaApi(APP_RECAPTCHA_CLIENT_KEY);
  const recaptchaTokenInputRef = React.createRef<HTMLInputElement>();
  const errors = mapOption(actionData?.errors?.fieldErrors, Object.keys) ?? [];

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="card border w-full max-w-sm p-4 px-6 gap-2"
        data-test="register-form"
        {...formProps}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (!APP_RECAPTCHA_DISABLED) {
            assert(recaptchaApi.data);
            assert(recaptchaTokenInputRef.current);
            const recaptchaToken = await recaptchaApi.data.execute(
              APP_RECAPTCHA_CLIENT_KEY
            );
            recaptchaTokenInputRef.current.value = recaptchaToken;
          }
          form.submit();
        }}
      >
        {actionData?.message ? (
          <div className="alert alert-error text-white text-sm">
            <div>Error: {actionData.message}</div>
          </div>
        ) : null}
        <div className="form-control">
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
        <div className="form-control">
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
        <div className="form-control">
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
        <input
          ref={recaptchaTokenInputRef as any}
          type="hidden"
          name="recaptchaToken"
        />
        <div className="form-control mt-2">
          <button
            type="submit"
            className="btn"
            disabled={!isValid || !recaptchaApi.isSuccess}
          >
            Register
          </button>
          <label className="label">
            <div className="label-text text-xs text-gray-400">
              Already have an account?{" "}
              <Link to={R["/users/signin"]} className="link link-primary">
                Sign in
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

interface RecaptchaApi {
  ready: (callback: () => void) => void;
  execute: (key: string) => Promise<string>;
}

async function loadRecaptchaApi(siteKey: string): Promise<RecaptchaApi> {
  await loadScriptMemoized(
    `https://www.google.com/recaptcha/api.js?render=${siteKey}`
  );
  const api = (window as any).grecaptcha as RecaptchaApi;
  assert(api);
  await new Promise((resolve) => api.ready(() => resolve(undefined)));
  return api;
}

export const useRecaptchaApi = createUseQuery(
  "recaptcha-api",
  loadRecaptchaApi,
  { staleTime: Infinity, cacheTime: Infinity }
);

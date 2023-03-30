import { mapOption, newPromiseWithResolvers, tinyassert } from "@hiogawa/utils";
import { Form, Link, useActionData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { once } from "lodash";
import React from "react";
import { toast } from "react-hot-toast";
import { R } from "../../misc/routes";
import {
  PASSWORD_MAX_LENGTH,
  REGISTER_SCHEMA,
  USERNAME_MAX_LENGTH,
  register,
  signinSession,
} from "../../utils/auth";
import { publicConfig, serverConfig } from "../../utils/config";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { useIsFormValid } from "../../utils/hooks";
import { loadScript, throwGetterProxy, usePromise } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { TIMEZONE_RE, getTimezone } from "../../utils/timezone";
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
  if (publicConfig.APP_RECAPTCHA_DISABLED) {
    return true;
  }

  // https://developers.google.com/recaptcha/docs/verify
  const url = "https://www.google.com/recaptcha/api/siteverify";
  const payload = {
    secret: serverConfig.APP_RECAPTCHA_SERVER_KEY,
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

  // double check just in case
  if (parsed.data.timezone && !parsed.data.timezone.match(TIMEZONE_RE)) {
    console.error("invalid timezone", parsed.data.timezone);
    parsed.data.timezone = undefined;
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
  const { APP_RECAPTCHA_CLIENT_KEY, APP_RECAPTCHA_DISABLED } = publicConfig;
  const actionData: ActionData | undefined = useActionData();
  const [isValid, formProps] = useIsFormValid();
  const recaptchaTokenInputRef = React.createRef<HTMLInputElement>();
  const errors = mapOption(actionData?.errors?.fieldErrors, Object.keys) ?? [];
  const timezone = React.useMemo(getTimezone, []);

  // TODO: teardown on unmount?
  const recaptchaApiQuery = useRecaptchaApi();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="register-form"
        {...formProps}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (!APP_RECAPTCHA_DISABLED) {
            tinyassert(recaptchaTokenInputRef.current);
            const recaptchaToken = await recaptchaApi.execute(
              APP_RECAPTCHA_CLIENT_KEY
            );
            recaptchaTokenInputRef.current.value = recaptchaToken;
          }
          form.submit();
        }}
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
            className="antd-input p-1"
            aria-invalid={errors.includes("username")}
            required
            maxLength={USERNAME_MAX_LENGTH}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            name="password"
            className="antd-input p-1"
            aria-invalid={errors.includes("password")}
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password confirmation</span>
          <input
            type="password"
            name="passwordConfirmation"
            className="antd-input p-1"
            aria-invalid={errors.includes("passwordConfirmation")}
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </label>
        <input
          ref={recaptchaTokenInputRef as any}
          type="hidden"
          name="recaptchaToken"
        />
        <input type="hidden" name="timezone" value={timezone} />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            className="antd-btn antd-btn-primary p-1"
            disabled={!isValid || !recaptchaApiQuery.isSuccess}
          >
            Register
          </button>
          <div className="text-sm text-colorTextSecondary">
            Already have an account?{" "}
            <Link to={R["/users/signin"]} className="antd-link">
              Sign in
            </Link>
          </div>
        </div>
        <div className="border-t"></div>
        {/* https://developers.google.com/recaptcha/docs/faq#id-like-to-hide-the-recaptcha-badge.-what-is-allowed */}
        <div className="text-colorTextSecondary text-xs">
          This site is protected by reCAPTCHA and the Google{" "}
          <a className="antd-link" href="https://policies.google.com/privacy">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a className="antd-link" href="https://policies.google.com/terms">
            Terms of Service
          </a>{" "}
          apply.
        </div>
      </Form>
    </div>
  );
}

export function HideRecaptchaBadge() {
  return <style>{".grecaptcha-badge { visibility: hidden; }"}</style>;
}

//
// recaptcha api
//

interface RecaptchaApi {
  ready: (callback: () => void) => void;
  execute: (key: string) => Promise<string>;
}

// singleton
let recaptchaApi: RecaptchaApi = throwGetterProxy as any;

const loadRecaptchaApi = once(async () => {
  const key = publicConfig.APP_RECAPTCHA_CLIENT_KEY;
  await loadScript(`https://www.google.com/recaptcha/api.js?render=${key}`);

  recaptchaApi = (window as any).grecaptcha as RecaptchaApi;
  tinyassert(recaptchaApi);

  const { promise, resolve } = newPromiseWithResolvers<void>();
  recaptchaApi.ready(() => resolve());
  await promise;
});

function useRecaptchaApi() {
  return usePromise(() => loadRecaptchaApi().then(() => null), {
    onError: () => {
      toast.error("failed to load recaptcha");
    },
  });
}

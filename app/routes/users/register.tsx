import { newPromiseWithResolvers, tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { Link } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import { once } from "lodash";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { $R, R } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { publicConfig } from "../../utils/config";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { loadScript, throwGetterProxy, usePromise } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Register",
};

//
// loader
//

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

//
// component
//

export default function DefaultComponent() {
  const registerMutation = useMutation({
    ...trpc.users_register.mutationOptions(),
    onSuccess: () => {
      window.location.href = $R["/users/redirect"](null, { type: "register" });
    },
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const recaptchaApiQuery = useRecaptchaApi();

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="register-form"
        onSubmit={form.handleSubmit(async (data) => {
          let recaptchaToken = "";
          if (!publicConfig.APP_RECAPTCHA_DISABLED) {
            recaptchaToken = await recaptchaApi.execute(
              publicConfig.APP_RECAPTCHA_CLIENT_KEY
            );
          }
          registerMutation.mutate({
            ...data,
            recaptchaToken,
            timezone: Temporal.Now.zonedDateTimeISO().offset,
          });
        })}
      >
        {registerMutation.isError && (
          <div className="text-colorError">
            <div>
              Error:{" "}
              {registerMutation.error instanceof Error
                ? registerMutation.error.message
                : "Failed to register"}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span>Username</span>
          <input
            type="text"
            className="antd-input p-1"
            {...form.register("username", { required: true })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            className="antd-input p-1"
            {...form.register("password", { required: true })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password confirmation</span>
          <input
            type="password"
            className="antd-input p-1"
            {...form.register("passwordConfirmation", { required: true })}
          />
        </label>
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            className="antd-btn antd-btn-primary p-1"
            disabled={
              !form.formState.isValid ||
              !recaptchaApiQuery.isSuccess ||
              registerMutation.isLoading
            }
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
      </form>
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

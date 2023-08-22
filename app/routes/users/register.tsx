import { Temporal } from "@js-temporal/polyfill";
import { Link } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { $R, R } from "../../misc/routes";
import { rpcClient } from "../../trpc/client";
import { setFlashMessage } from "../../utils/flash-message";
import { cls } from "../../utils/misc";
import { navigateRefresh } from "../../utils/misc-client";
import type { PageHandle } from "../../utils/page-handle";
import { useTurnstile } from "../../utils/turnstile-utils";

export { loader } from "./register.server";

export const handle: PageHandle = {
  navBarTitle: () => "Register",
};

export default function DefaultComponent() {
  type FormState = {
    username: string;
    password: string;
    passwordConfirmation: string;
  };

  const turnstile = useTurnstile();

  const registerMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const token = await turnstile.render();
      await rpcClient.users_register({
        ...data,
        token,
        timezone: Temporal.Now.zonedDateTimeISO().offset,
      });
    },
    onSuccess: () => {
      setFlashMessage({
        variant: "success",
        content: "Successfully registered",
      });
      navigateRefresh($R["/"]());
    },
  });

  const form = useForm<FormState>({
    defaultValues: {
      username: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="register-form"
        onSubmit={form.handleSubmit(async (data) => {
          registerMutation.mutate(data);
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
            className={cls(
              "antd-btn antd-btn-primary p-1",
              registerMutation.isLoading && "antd-btn-loading"
            )}
            disabled={
              !form.formState.isValid ||
              !turnstile.query.isSuccess ||
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
        <div ref={turnstile.ref} className="absolute"></div>
      </form>
    </div>
  );
}

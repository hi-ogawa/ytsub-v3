import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { Temporal } from "@js-temporal/polyfill";
import { Link, useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { $R, R } from "../../misc/routes";
import { rpcClient } from "../../trpc/client";
import { useSetCurrentUser } from "../../utils/current-user";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { useTurnstile } from "../../utils/turnstile-utils";

export { loader } from "./register.server";

export const handle: PageHandle = {
  navBarTitle: () => "Register",
};

export default function DefaultComponent() {
  const turnstile = useTurnstile();

  const setCurrentUser = useSetCurrentUser();
  const navigate = useNavigate();
  const registerMutation = useMutation({
    mutationFn: async () => {
      const token = await turnstile.render();
      return rpcClient.users_register({
        ...form.data,
        token,
        timezone: Temporal.Now.zonedDateTimeISO().offset,
      });
    },
    onSuccess: (data) => {
      toast.success("Successfully registered");
      setCurrentUser(data);
      navigate($R["/"]());
    },
  });

  const form = useTinyForm({
    username: "",
    password: "",
    passwordConfirmation: "",
  });

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="register-form"
        onSubmit={form.handleSubmit(() => registerMutation.mutate())}
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
            required
            {...form.fields.username.valueProps()}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            className="antd-input p-1"
            required
            {...form.fields.password.valueProps()}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password confirmation</span>
          <input
            type="password"
            className="antd-input p-1"
            required
            {...form.fields.passwordConfirmation.valueProps()}
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
              !turnstile.query.isSuccess ||
              registerMutation.isLoading ||
              registerMutation.isSuccess
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

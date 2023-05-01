import { Link } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { $R } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Sign in",
};

// completely reuse /users/register loader
export { loader } from "./register";

//
// component
//

export default function DefaultComponent() {
  const signinMutation = useMutation({
    ...trpc.users_signin.mutationOptions(),
    onSuccess: () => {
      window.location.href = $R["/users/redirect"](null, { type: "signin" });
    },
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="signin-form"
        onSubmit={form.handleSubmit((data) => signinMutation.mutate(data))}
      >
        {signinMutation.isError && (
          <div className="text-colorError">
            <div>
              Error:{" "}
              {signinMutation.error instanceof Error
                ? signinMutation.error.message
                : "Failed to signin"}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span>Username</span>
          <input
            type="text"
            className="antd-input p-1"
            autoFocus
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
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            className={cls(
              "antd-btn antd-btn-primary p-1",
              signinMutation.isLoading && "antd-btn-loading"
            )}
            disabled={!form.formState.isValid || signinMutation.isLoading}
          >
            Sign in
          </button>
          <div className="text-sm text-colorTextSecondary">
            Don't have an account yet?{" "}
            <Link to={$R["/users/register"]()} className="antd-link">
              Register
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

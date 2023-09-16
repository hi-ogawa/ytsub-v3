import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { Link, useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { $R } from "../../misc/routes";
import { rpcClientQuery } from "../../trpc/client";
import { useSetCurrentUser } from "../../utils/current-user";
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
  const setCurrentUser = useSetCurrentUser();
  const navigate = useNavigate();

  const signinMutation = useMutation({
    ...rpcClientQuery.users_signin.mutationOptions(),
    onSuccess: (data) => {
      toast.success("Successfully signed in");
      setCurrentUser(data);
      navigate($R["/"]());
    },
  });

  const form = useTinyForm({
    username: "",
    password: "",
  });

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="signin-form"
        onSubmit={form.handleSubmit(() => signinMutation.mutate(form.data))}
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
            required
            {...form.fields.username.props()}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            className="antd-input p-1"
            required
            {...form.fields.password.props()}
          />
        </label>
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            className={cls(
              "antd-btn antd-btn-primary p-1",
              signinMutation.isLoading && "antd-btn-loading"
            )}
            disabled={signinMutation.isLoading || signinMutation.isSuccess}
          >
            Sign in
          </button>
          <div className="text-sm text-colorTextSecondary">
            Don't have an account yet?{" "}
            <Link to={$R["/users/register"]()} className="antd-link">
              Register
            </Link>
          </div>
          <Link
            className="antd-link text-sm"
            to={$R["/users/password-reset"]()}
          >
            Forgot your password?
          </Link>
        </div>
      </form>
    </div>
  );
}

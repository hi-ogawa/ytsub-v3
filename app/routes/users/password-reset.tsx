import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { $R } from "../../misc/routes";
import { rpcClient } from "../../trpc/client-v2";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { useTurnstile } from "../../utils/turnstile-utils";

export const handle: PageHandle = {
  navBarTitle: () => "Reset password",
};

//
// component
//

export default function Page() {
  const navigate = useNavigate();

  const turnstile = useTurnstile();

  const mutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const token = await turnstile.render();
      return rpcClient.users_requestResetPassword({
        email,
        token,
      });
    },
    onSuccess: () => {
      toast.success("Please check your email to reset your password");
      navigate($R["/"]());
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
  });

  return (
    <div className="w-full p-4 gap-4 flex flex-col items-center">
      <form
        className="h-full w-full max-w-md border"
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
      >
        <div className="h-full p-6 flex flex-col gap-3">
          <h1 className="text-xl">Reset password</h1>
          <div className="w-full flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              Email
              <input
                className="antd-input p-1"
                {...form.register("email", { required: true })}
              />
            </label>
            <button
              type="submit"
              className={cls(
                "antd-btn antd-btn-primary p-1 flex justify-center items-center",
                mutation.isLoading && "antd-btn-loading"
              )}
              disabled={
                !form.formState.isValid ||
                mutation.isLoading ||
                !turnstile.query.isSuccess
              }
            >
              Submit
            </button>
            <div ref={turnstile.ref} className="absolute"></div>
          </div>
        </div>
      </form>
    </div>
  );
}

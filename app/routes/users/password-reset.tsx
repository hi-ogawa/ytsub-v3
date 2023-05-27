import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { $R } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Reset password",
};

//
// component
//

export default function Page() {
  const navigate = useNavigate();

  const mutation = useMutation({
    ...trpc.users_requestResetPassword.mutationOptions(),
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
            <div className="flex flex-col gap-1">
              Email
              <input
                className="antd-input p-1"
                {...form.register("email", { required: true })}
              />
            </div>
            <button
              type="submit"
              className={cls(
                "antd-btn antd-btn-primary p-1 flex justify-center items-center",
                mutation.isLoading && "antd-btn-loading"
              )}
              disabled={!form.formState.isValid || mutation.isLoading}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

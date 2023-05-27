import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { $R, ROUTE_DEF } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Reset password",
};

//
// loader
//

type LoaderData = { code: string };

export const loader = makeLoader(async ({ ctx }) => {
  // only check the existence
  const { code } = ROUTE_DEF["/users/password-new"].query.parse(ctx.query);
  return { code } satisfies LoaderData;
});

//
// component
//

export default function Page() {
  const { code } = useLoaderDataExtra() as LoaderData;

  const navigate = useNavigate();

  const mutation = useMutation({
    ...trpc.users_resetPassword.mutationOptions(),
    onSuccess: () => {
      // TODO: force logging out?
      toast.success("Successfully reset your password");
      navigate($R["/"]());
    },
  });

  const form = useForm({
    defaultValues: {
      code,
      password: "",
      passwordConfirmation: "",
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
              Password
              <input
                className="antd-input p-1"
                type="password"
                {...form.register("password", { required: true })}
              />
            </label>
            <label className="flex flex-col gap-1">
              Password confirmation
              <input
                className="antd-input p-1"
                type="password"
                {...form.register("passwordConfirmation", { required: true })}
              />
            </label>
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

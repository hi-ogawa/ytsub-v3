import { Temporal } from "@js-temporal/polyfill";
import { Link } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { $R, R } from "../../misc/routes";
import { trpcClient } from "../../trpc/client-internal.client";
import { encodeFlashMessage } from "../../utils/flash-message";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { useTurnstile } from "../../utils/turnstile-utils";

export const handle: PageHandle = {
  navBarTitle: () => "Register",
};

//
// loader
//

export const loader = makeLoader(async ({ ctx }) => {
  const user = await ctx.currentUser();
  if (user) {
    return redirect(
      R["/users/me"] +
        "?" +
        encodeFlashMessage({
          content: `Already signed in as '${user.username}'`,
          variant: "error",
        })
    );
  }
  return null;
});

//
// component
//

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
      await trpcClient.users_register.mutate({
        ...data,
        token,
        timezone: Temporal.Now.zonedDateTimeISO().offset,
      });
    },
    onSuccess: () => {
      window.location.href =
        $R["/"]() +
        "?" +
        encodeFlashMessage({
          variant: "success",
          content: "Successfully registered",
        });
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

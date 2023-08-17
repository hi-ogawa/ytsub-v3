import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useModal } from "../../components/modal";
import { PopoverSimple } from "../../components/popover";
import type { UserTable } from "../../db/models";
import { rpcClient, rpcClientQuery } from "../../trpc/client-v2";
import { intl } from "../../utils/intl";
import {
  FILTERED_LANGUAGE_CODES,
  languageCodeToName,
} from "../../utils/language";
import { useLeafLoaderData } from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { useTurnstile } from "../../utils/turnstile-utils";

export const handle: PageHandle = {
  navBarTitle: () => "Account",
};

//
// loader
//

export const loader = makeLoader(async ({ ctx }) => {
  const user = await ctx.requireUser();
  return user;
});

//
// component
//

export default function DefaultComponent() {
  const currentUser = useLeafLoaderData() as UserTable;

  const navigate = useNavigate();

  const updateMutation = useMutation({
    ...rpcClientQuery.users_update.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully updated settings");
      form.reset(form.getValues());
      navigate({}, { replace: true }); // refetch root loader currentUser
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const turnstile = useTurnstile();

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const token = await turnstile.render();
      return rpcClient.users_requestResetPassword({
        email,
        token,
      });
    },
    onSuccess: () => {
      toast.success("Please check your email to reset your password");
    },
  });

  const form = useForm({
    defaultValues: {
      language1: currentUser.language1 ?? "",
      language2: currentUser.language2 ?? "",
      timezone: currentUser.timezone,
    },
  });

  const updateEmailModal = useModal();

  return (
    <div className="w-full p-4 gap-4 flex flex-col items-center">
      <form
        className="h-full w-full max-w-md border"
        onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
      >
        <div className="h-full p-6 flex flex-col gap-3">
          <h1 className="text-xl">Account</h1>
          <div className="w-full flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              Username
              <input
                className="antd-input p-1"
                disabled
                readOnly
                value={currentUser.username}
                data-test="me-username"
              />
            </label>
            <div className="flex flex-col gap-1">
              Email
              <input
                data-testid="me-email"
                className="antd-input p-1"
                disabled
                readOnly
                value={currentUser.email ?? "(no email)"}
              />
            </div>
            <label className="flex flex-col gap-1">
              Created At
              <input
                suppressHydrationWarning
                className="antd-input p-1"
                disabled
                readOnly
                value={intl.formatDate(currentUser.createdAt, {
                  dateStyle: "long",
                  timeStyle: "long",
                  hour12: false,
                })}
              />
            </label>
            <label className="flex flex-col gap-1">
              1st language
              <select
                className="antd-input p-1"
                // pass defaultValue explicitly to avoid ssr flickering https://github.com/react-hook-form/react-hook-form/issues/8707
                defaultValue={form.formState.defaultValues?.language1}
                {...form.register("language1", { required: true })}
              >
                <LanguageSelectOptions />
              </select>
            </label>
            <label className="flex flex-col gap-1">
              2nd language
              <select
                className="antd-input p-1"
                defaultValue={form.formState.defaultValues?.language2}
                {...form.register("language2", { required: true })}
              >
                <LanguageSelectOptions />
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <div>Timezone</div>
                <PopoverSimple
                  placement="top"
                  reference={
                    <button
                      type="button"
                      className="antd-btn antd-btn-ghost i-ri-question-line w-4 h-4"
                    />
                  }
                  floating={
                    <div className="p-3 text-sm">
                      UTC offset, e.g.
                      <br />
                      +09:00 (Asia/Tokyo) <br />
                      -05:00 (EST)
                    </div>
                  }
                />
              </div>
              <input
                className="antd-input p-1"
                defaultValue={form.formState.defaultValues?.timezone}
                {...form.register("timezone", { required: true })}
              />
            </div>
            <button
              type="submit"
              className={cls(
                "antd-btn antd-btn-primary p-1 flex justify-center items-center",
                updateMutation.isLoading && "antd-btn-loading"
              )}
              disabled={
                !form.formState.isDirty ||
                !form.formState.isValid ||
                updateMutation.isLoading
              }
            >
              Save
            </button>
          </div>
        </div>
      </form>
      <div
        className="h-full w-full max-w-md border p-4 flex flex-col gap-3"
        onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
      >
        <h1 className="text-xl">Security</h1>
        <button
          className="antd-btn antd-btn-default p-0.5"
          onClick={() => updateEmailModal.setOpen(true)}
        >
          Change email
        </button>
        {currentUser.email && (
          <button
            className={cls(
              "antd-btn antd-btn-default p-0.5 flex justify-center",
              resetPasswordMutation.isLoading && "antd-btn-loading"
            )}
            disabled={
              !turnstile.query.isSuccess || resetPasswordMutation.isLoading
            }
            onClick={() =>
              currentUser.email &&
              resetPasswordMutation.mutate({ email: currentUser.email })
            }
          >
            Reset password
          </button>
        )}
        <div ref={turnstile.ref} className="absolute"></div>
      </div>
      <updateEmailModal.Wrapper>
        <UpdateEmailForm onSuccess={() => updateEmailModal.setOpen(false)} />
      </updateEmailModal.Wrapper>
    </div>
  );
}

function UpdateEmailForm(props: { onSuccess: () => void }) {
  const form = useForm({ defaultValues: { email: "" } });
  const formIsValid = form.formState.isValid;

  const mutation = useMutation({
    ...rpcClientQuery.users_requestUpdateEmail.mutationOptions(),
    onSuccess: () => {
      toast.success("Verification email is sent successfullly");
      props.onSuccess();
    },
  });

  return (
    <form
      className="flex flex-col gap-3 p-4 relative"
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
    >
      <h2 className="text-xl">Update Email</h2>
      <label className="flex flex-col gap-1">
        <input
          className="antd-input p-1"
          placeholder="Input new email..."
          {...form.register("email", { required: true })}
        />
      </label>
      <button
        className={cls(
          "antd-btn antd-btn-primary p-1",
          mutation.isLoading && "antd-btn-loading"
        )}
        disabled={mutation.isLoading || !formIsValid}
      >
        Send Verification Email
      </button>
    </form>
  );
}

function LanguageSelectOptions() {
  return (
    <>
      <option value="" disabled />
      {FILTERED_LANGUAGE_CODES.map((code) => (
        <option key={code} value={code}>
          {languageCodeToName(code)}
        </option>
      ))}
    </>
  );
}

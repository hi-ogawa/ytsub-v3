import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { PopoverSimple } from "../../components/popover";
import type { UserTable } from "../../db/models";
import { R } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";
import { dtf } from "../../utils/intl";
import {
  FILTERED_LANGUAGE_CODES,
  languageCodeToName,
} from "../../utils/language";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Account",
};

//
// loader
//

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (user) {
    return this.serialize(user);
  }
  return redirect(R["/users/signin"]);
});

//
// component
//

export default function DefaultComponent() {
  const currentUser: UserTable = deserialize(useLoaderData());

  const updateMutation = useMutation({
    ...trpc.users_update.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully updated settings");
      form.reset(form.getValues());
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const form = useForm({
    defaultValues: {
      language1: currentUser.language1 ?? "",
      language2: currentUser.language2 ?? "",
      timezone: currentUser.timezone,
    },
  });

  return (
    <div className="w-full p-4 flex justify-center">
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
            <label className="flex flex-col gap-1">
              Created At
              <input
                suppressHydrationWarning
                className="antd-input p-1"
                disabled
                readOnly
                value={dtf.format(currentUser.createdAt)}
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
    </div>
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

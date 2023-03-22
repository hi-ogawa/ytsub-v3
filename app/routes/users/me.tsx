import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/server-runtime";
import React from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { PopoverSimple } from "../../components/popover";
import { Q } from "../../db/models";
import type { UserTable } from "../../db/models";
import { R } from "../../misc/routes";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";
import { useIsFormValid } from "../../utils/hooks";
import { dtf } from "../../utils/intl";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  languageCodeToName,
} from "../../utils/language";
import type { PageHandle } from "../../utils/page-handle";
import { TIMEZONE_RE } from "../../utils/timezone";
import { zKeys } from "../../utils/zod-utils";

export const handle: PageHandle = {
  navBarTitle: () => "Account",
};

export const loader = makeLoader(Controller, async function () {
  // TODO: here we're loading the same data as root loader for simplicity
  const user = await this.currentUser();
  if (user) {
    return this.serialize(user);
  }
  return redirect(R["/users/signin"]);
});

const ACTION_SCHEMA = z.object({
  language1: z.string().nonempty(),
  language2: z.string().nonempty(),
  timezone: z.string().regex(TIMEZONE_RE),
});

const ACTION_SCHEMA_KEYS = zKeys(ACTION_SCHEMA);

export const action = makeLoader(Controller, async function () {
  const user = await this.requireUser();
  const parsed = ACTION_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return json({ success: false, message: "Fail to update settings" });
  }
  await Q.users().update(parsed.data).where("id", user.id);
  return json({ success: true, message: "Settings updated successfuly" });
});

export default function DefaultComponent() {
  const currentUser: UserTable = deserialize(useLoaderData());
  const transition = useTransition();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const [changed, setChanged] = React.useState(false);
  const [isValid, formProps] = useIsFormValid();

  // Reset form on success
  React.useEffect(() => {
    if (!actionData) return;
    const { message, success } = actionData;
    if (success) {
      toast.success(message);
      setChanged(false);
    } else {
      toast.error(message);
    }
  }, [actionData]);

  const isLoading =
    transition.state !== "idle" &&
    transition.location?.pathname === R["/users/me"];

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        replace
        method="post"
        className="h-full w-full max-w-md border"
        {...formProps}
        onChange={() => {
          formProps.onChange();
          setChanged(true);
        }}
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
                className="antd-input p-1"
                disabled
                readOnly
                value={dtf.format(currentUser.createdAt)}
              />
            </label>
            <label className="flex flex-col gap-1">
              1st language
              <LanguageSelect
                name={ACTION_SCHEMA_KEYS.language1}
                className="antd-input p-1"
                defaultValue={currentUser.language1 ?? ""}
                languageCodes={FILTERED_LANGUAGE_CODES}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              2nd language
              <LanguageSelect
                name={ACTION_SCHEMA_KEYS.language2}
                className="antd-input p-1"
                defaultValue={currentUser.language2 ?? ""}
                languageCodes={FILTERED_LANGUAGE_CODES}
                required
              />
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
                name={ACTION_SCHEMA_KEYS.timezone}
                className="antd-input p-1"
                defaultValue={currentUser.timezone}
                required
              />
            </div>
            <button
              type="submit"
              className="antd-btn antd-btn-primary p-1 relative flex justify-center items-center"
              disabled={!isValid || !changed || isLoading}
            >
              Save
              {isLoading && <span className="absolute antd-spin w-4 right-2" />}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}

function LanguageSelect({
  languageCodes,
  ...props
}: {
  languageCodes: LanguageCode[];
} & JSX.IntrinsicElements["select"]) {
  return (
    <select {...props}>
      <option value="" disabled />
      {languageCodes.map((code) => (
        <option key={code} value={code}>
          {languageCodeToName(code)}
        </option>
      ))}
    </select>
  );
}

import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { useSnackbar } from "../../components/snackbar";
import { tables } from "../../db/models";
import type { UserTable } from "../../db/models";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";
import { useIsFormValid } from "../../utils/hooks";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  languageCodeToName,
} from "../../utils/language";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "Account",
};

export const loader = makeLoader(Controller, async function () {
  // TODO: here we're loading the same data as root loader for simplicity
  const user = await this.currentUser();
  if (user) {
    return this.serialize(user);
  }
  return redirect("/users/signin");
});

const ACTION_SCHEMA = z.object({
  language1: z.string().nonempty(),
  language2: z.string().nonempty(),
});

export const action = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (user === undefined) {
    return redirect("/users/signin");
  }
  const parsed = ACTION_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return json({ success: false, message: "Fail to update settings" });
  }
  await tables.users().update(parsed.data).where("id", user.id);
  return json({ success: true, message: "Settings updated successfuly" });
});

export default function DefaultComponent() {
  const currentUser: UserTable = deserialize(useLoaderData());
  const transition = useTransition();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const [changed, setChanged] = React.useState(false);
  const [isValid, formProps] = useIsFormValid();
  const { enqueueSnackbar } = useSnackbar();

  // Reset form on success
  React.useEffect(() => {
    if (!actionData) return;
    const { message, success } = actionData;
    enqueueSnackbar(message, { variant: success ? "success" : "error" });
    if (success) {
      setChanged(false);
    }
  }, [actionData]);

  const isLoading =
    transition.state !== "idle" &&
    transition.location?.pathname === "/users/me";

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        replace
        method="post"
        className="h-full w-full max-w-md rounded-lg border border-base-300"
        {...formProps}
        onChange={() => {
          formProps.onChange();
          setChanged(true);
        }}
      >
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-2">Account</div>
          <div className="w-full flex flex-col gap-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                className="input input-bordered bg-gray-100"
                readOnly
                value={currentUser.username}
                data-test="me-username"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Account Created At</span>
              </label>
              <input
                className="input input-bordered bg-gray-100"
                readOnly
                value={currentUser.createdAt.toISOString()}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">1st language</label>
              </label>
              <LanguageSelect
                name="language1"
                className="select select-bordered font-normal"
                defaultValue={currentUser.language1 ?? ""}
                languageCodes={FILTERED_LANGUAGE_CODES}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">2nd language</label>
              </label>
              <LanguageSelect
                name="language2"
                className="select select-bordered font-normal"
                defaultValue={currentUser.language2 ?? ""}
                languageCodes={FILTERED_LANGUAGE_CODES}
                required
              />
            </div>
            <div className="form-control pt-2">
              <button
                type="submit"
                className={`btn ${isLoading && "loading"}`}
                disabled={!isValid || !changed || isLoading}
              >
                {!isLoading && "Save"}
              </button>
            </div>
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

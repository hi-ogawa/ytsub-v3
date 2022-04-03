import {
  Form,
  useActionData,
  useNavigate,
  useTransition,
} from "@remix-run/react";
import {
  ActionFunction,
  LoaderFunction,
  json,
  redirect,
} from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { users } from "../../db/models";
import { useRootLoaderData } from "../../utils/root-utils";
import { getSessionUserId } from "../../utils/auth";
import { useIsFormValid } from "../../utils/hooks";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  languageCodeToName,
} from "../../utils/language";
import { PageHandle } from "../../utils/page-handle";
import {
  pushFlashMessage,
  withRequestSession,
} from "../../utils/session-utils";
import { fromRequestForm } from "../../utils/url-data";
import type { UserTable } from "../../db/models";

export const handle: PageHandle = {
  navBarTitle: "Account",
};

export const loader: LoaderFunction = withRequestSession(
  async ({ session }) => {
    // Check only user id in session on server
    if (getSessionUserId(session) === undefined) {
      return redirect("/users/signin");
    }
    return null;
  }
);

const ACTION_SCHEMA = z.object({
  language1: z.string().nonempty(),
  language2: z.string().nonempty(),
});

export const action: ActionFunction = withRequestSession(
  async ({ request, session }) => {
    const id = getSessionUserId(session);
    if (id === undefined) {
      return redirect("/users/signin");
    }
    const parsed = ACTION_SCHEMA.safeParse(await fromRequestForm(request));
    if (!parsed.success) {
      pushFlashMessage(session, {
        content: "Fail to update settings",
        variant: "error",
      });
      return json({ success: false });
    }
    await users()
      .update({ settings: JSON.stringify(parsed.data) as any })
      .where("id", id);
    pushFlashMessage(session, {
      content: "Settings updated successfuly",
      variant: "success",
    });
    return json({ success: true });
  }
);

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const navigate = useNavigate();

  // Check root loader's user data on client
  React.useEffect(() => {
    if (currentUser === undefined) {
      navigate("/users/signin");
    }
  }, [currentUser]);

  return currentUser ? <ImplComponent currentUser={currentUser} /> : null;
}

export function ImplComponent({ currentUser }: { currentUser: UserTable }) {
  const transition = useTransition();
  const actionData = useActionData<{ success: boolean }>();
  const [changed, setChanged] = React.useState(false);
  const [isValid, formProps] = useIsFormValid();

  // Reset form on success
  React.useEffect(() => {
    if (actionData?.success) {
      setChanged(false);
    }
  }, [actionData]);

  // TODO:
  // this would cause loading state when loading unrelated data (e.g. signout)
  // but, matching by `transition.location.pathname === "/users/me"` also misses loading of the root loader.
  const isLoading = transition.state !== "idle";

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
                defaultValue={currentUser.settings.language1 ?? ""}
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
                defaultValue={currentUser.settings.language2 ?? ""}
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

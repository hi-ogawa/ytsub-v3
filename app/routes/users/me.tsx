import { Form, useNavigate } from "@remix-run/react";
import { LoaderFunction, redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { useRootLoaderData } from "../../root";
import { getSessionUserId } from "../../utils/auth";
import { PageHandle } from "../../utils/page-handle";
import { withRequestSession } from "../../utils/session-utils";

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

export default function DefaultComponent() {
  const data = useRootLoaderData();
  const navigate = useNavigate();

  // Check user data on client
  React.useEffect(() => {
    if (data.currentUser === undefined) {
      navigate("/users/signin");
    }
  }, [data]);

  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-md rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-2">Account</div>
          <div className="w-full flex flex-col gap-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                className="input input-bordered"
                readOnly
                value={data.currentUser?.username}
                data-test="me-username"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Account Created At</span>
              </label>
              <input
                className="input input-bordered"
                readOnly
                value={data.currentUser?.createdAt.toISOString()}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <div className="label-text">
                  <Form method="post" action="/users/signout">
                    <button type="submit" className="link">
                      Sign out
                    </button>
                  </Form>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

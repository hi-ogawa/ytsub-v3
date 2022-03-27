import * as React from "react";
import { Form, Link } from "@remix-run/react";
import { useIsFormValid } from "../../utils/hooks";

export default function DefaultComponent() {
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form method="post" className="card border w-80 p-4 px-6" {...formProps}>
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            name="username"
            className="input input-bordered"
            required
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            name="password"
            className="input input-bordered"
            required
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Login
          </button>
          <label className="label">
            <div className="label-text text-xs text-gray-400">
              Don't have an account yet?{" "}
              <Link to="/users/register" className="link link-primary">
                Register
              </Link>
            </div>
          </label>
        </div>
      </Form>
    </div>
  );
}

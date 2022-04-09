import { Link } from "@remix-run/react";
import * as React from "react";
import { PageHandle } from "../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "Home",
};

export default function Component() {
  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-2">Examples</div>
          <ul className="menu">
            <li>
              <Link className="rounded" to="/setup?videoId=_2FF6O6Z8Hc">
                _2FF6O6Z8Hc
              </Link>
            </li>
            <li>
              <Link className="rounded" to="/setup?videoId=MoH8Fk2K9bc">
                MoH8Fk2K9bc
              </Link>
            </li>
            <li>
              <Link className="rounded" to="/setup?videoId=EnPYXckiUVg">
                EnPYXckiUVg
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

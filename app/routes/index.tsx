import { Link } from "@remix-run/react";
import * as React from "react";

export default function Component() {
  return (
    <div className="h-full w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-xl card border border-base-300">
        <div className="h-full card-body">
          <div className="flex-[1_0_0] overflow-auto">
            <ul className="menu">
              <li>
                <Link className="rounded" to="/setup?id=MoH8Fk2K9bc">
                  MoH8Fk2K9bc
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

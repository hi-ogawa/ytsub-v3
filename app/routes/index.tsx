import { Link } from "@remix-run/react";
import * as React from "react";
import { R } from "../misc/routes";
import { PageHandle } from "../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "Home",
};

// TODO: use video data for anonymous users
const VIDEO_IDS = ["_2FF6O6Z8Hc", "MoH8Fk2K9bc", "EnPYXckiUVg"];

export default function Component() {
  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-2">Examples</div>
          <ul className="menu">
            {VIDEO_IDS.map((videoId) => (
              <li key={videoId}>
                <Link
                  className="rounded"
                  to={R["/videos/new"] + `?videoId=${videoId}`}
                >
                  {videoId}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

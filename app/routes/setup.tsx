import * as React from "react";
import { LoaderFunction, json } from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { fetchPlayerResponse } from "../utils/youtube";

export const loader: LoaderFunction = async ({ request }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    throw json("Invalid Video ID");
  }
  const data = await fetchPlayerResponse(id);
  return data;
};

export default function Component() {
  const data = useLoaderData();
  return (
    <div className="h-full w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-xl card border border-base-300">
        <div className="h-full card-body">
          <div className="flex-[1_0_0] overflow-auto">
            <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { LoaderFunction, json, redirect } from "@remix-run/server-runtime";
import { useCatch } from "@remix-run/react";
import { parseVideoId } from "../utils/youtube";

// see manifest.json
const SHARE_TARGET_TEXT = "share-target-text";

export const loader: LoaderFunction = async ({ request }) => {
  const shareTargetText = new URL(request.url).searchParams.get(
    SHARE_TARGET_TEXT
  );
  if (shareTargetText) {
    const videoId = parseVideoId(shareTargetText);
    if (videoId) {
      return redirect(`/setup?videoId=${videoId}`);
    }
  }
  throw json({ message: "Invalid share data" });
};

export function CatchBoundary() {
  const { data } = useCatch();
  return <div>ERROR: {data.message}</div>;
}

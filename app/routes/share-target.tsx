import { redirect } from "@remix-run/server-runtime";
import { R } from "../misc/routes";
import { Controller, makeLoader } from "../utils/controller-utils";
import { parseVideoId } from "../utils/youtube";

// see manifest.json
const SHARE_TARGET_TEXT = "share-target-text";

export const loader = makeLoader(Controller, function () {
  const shareTargetText = new URL(this.request.url).searchParams.get(
    SHARE_TARGET_TEXT
  );
  if (shareTargetText) {
    const videoId = parseVideoId(shareTargetText);
    if (videoId) {
      return redirect(R["/videos/new"] + `?videoId=${videoId}`);
    }
  }
  this.flash({ variant: "error", content: "Failed to handle share" });
  return redirect(R["/"]);
});

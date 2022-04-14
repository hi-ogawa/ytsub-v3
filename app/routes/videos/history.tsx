import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { VideoComponent } from "../../components/misc";
import { VideoTable, tables } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { pushFlashMessage } from "../../utils/session-utils";

export const handle: PageHandle = {
  // Saved or Created Videos?
  navBarTitle: "History",
};

// TODO
// - use `/videos/index.tsx`
// - filter by language
// - filter by author
// - pagination
// - order by "lastWatchedAt"
// - better layout for desktop
// - show language pair

export interface HistoryLoaderData {
  videos: VideoTable[];
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    pushFlashMessage(this.session, {
      content: "Signin required.",
      variant: "error",
    });
    return redirect(R["/users/signin"]);
  }
  const videos = await tables
    .videos()
    .select("*")
    .where("userId", user.id)
    .orderBy("createdAt", "desc");
  const data: HistoryLoaderData = { videos };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: HistoryLoaderData = useDeserialize(useLoaderData());
  return <HistoryComponent videos={data.videos} />;
}

export function HistoryComponent({ videos }: { videos: VideoTable[] }) {
  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {videos.length === 0 && <div>Empty</div>}
          {videos.map((video) => (
            <VideoComponent key={video.id} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
}

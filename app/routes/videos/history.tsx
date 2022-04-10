import { Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { VideoTable, tables } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { pushFlashMessage } from "../../utils/session-utils";
import { toThumbnail } from "../../utils/youtube";

export const handle: PageHandle = {
  navBarTitle: "History",
};

// TODO
// - filter by language
// - pagination
// - order by "lastWatchedAt"
// - better layout for desktop
// - show language pair

interface LoaderData {
  videos: VideoTable[];
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    pushFlashMessage(this.session, { content: "Signin required." });
    return redirect(R["/"]);
  }
  const videos = await tables
    .videos()
    .select("*")
    .where("userId", user.id)
    .orderBy("createdAt", "desc");
  const data: LoaderData = { videos };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <ComponentImpl videos={data.videos} />;
}

function ComponentImpl({ videos }: { videos: VideoTable[] }) {
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

function VideoComponent({ video }: { video: VideoTable }) {
  const { id, videoId, title, author, channelId } = video;
  const to = R["/videos/$id"](id);

  /*
    Layout

    <- 16 -> <--- 20 --->
    ↑        ↑
    9 (cover)|
    ↓        ↓
   */

  return (
    <div className="w-full flex border" style={{ aspectRatio: "36 / 9" }}>
      <Link
        to={to}
        className="flex-none w-[44%] relative aspect-video overflow-hidden"
      >
        <img
          className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
          src={toThumbnail(videoId)}
        />
      </Link>
      <div className="p-2 flex flex-col relative text-sm">
        <Link to={to} className="line-clamp-2 mb-2">
          {title}
        </Link>
        <a
          href={"https://www.youtube.com/channel/" + channelId}
          target="_blank"
          className="w-11/12 line-clamp-1 text-gray-600 text-xs"
        >
          {author}
        </a>
      </div>
    </div>
  );
}

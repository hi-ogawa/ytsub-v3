import { Link } from "@remix-run/react";
import * as React from "react";
import { VideoTable } from "../db/models";
import { R } from "../misc/routes";
import { toThumbnail } from "../utils/youtube";

export function VideoComponent({
  video,
}: {
  video: Pick<
    VideoTable,
    | "id"
    | "videoId"
    | "title"
    | "author"
    | "channelId"
    | "language1_id"
    | "language1_translation"
    | "language2_id"
    | "language2_translation"
  >;
}) {
  const { id, videoId, title, author, channelId } = video;
  const to = R["/videos/$id"](id);
  const code1 = video.language1_translation ?? video.language1_id.slice(1, 3);
  const code2 = video.language2_translation ?? video.language2_id.slice(1, 3);

  /*
    Layout

    <- 16 -> <--- 20 --->
    ↑        ↑
    9 (cover)|
    ↓        ↓
   */

  return (
    <div className="w-full flex border" style={{ aspectRatio: "36 / 9" }}>
      <div className="flex-none w-[44%] relative aspect-video overflow-hidden">
        <Link to={to} className="w-full h-full">
          <img
            className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
            src={toThumbnail(videoId)}
          />
        </Link>
        <div className="absolute right-1 bottom-1 px-1 py-0.5 rounded bg-black/75 text-white text-xs font-bold">
          <div>
            {code1} - {code2}
          </div>
        </div>
      </div>
      <div className="p-2 flex flex-col relative text-sm">
        <Link to={to} className="line-clamp-2 mb-2">
          {title}
        </Link>
        <a
          href={"https://www.youtube.com/channel/" + channelId}
          target="_blank"
          className="line-clamp-1 text-gray-600 text-xs"
        >
          {author}
        </a>
      </div>
    </div>
  );
}

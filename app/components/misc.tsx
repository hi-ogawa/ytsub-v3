import { Link } from "@remix-run/react";
import type React from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
} from "react-feather";
import type { PaginationMetadata, VideoTable } from "../db/models";
import { R } from "../misc/routes";
import { cls } from "../utils/misc";
import { toNewPages } from "../utils/pagination";
import { toQuery } from "../utils/url-data";
import { parseVssId, toThumbnail } from "../utils/youtube";
import { PopoverSimple } from "./popover";

export function VideoComponent({
  video,
  bookmarkEntriesCount,
  actions,
  isLoading = false,
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
  bookmarkEntriesCount?: number;
  actions?: React.ReactNode;
  isLoading?: boolean;
}) {
  const { id, videoId, title, author, channelId } = video;
  const to = R["/videos/$id"](id);
  const code1 = video.language1_translation ?? parseVssId(video.language1_id);
  const code2 = video.language2_translation ?? parseVssId(video.language2_id);

  /*
    Layout

    <- 16 -> <--- 20 --->
    ↑        ↑
    9 (cover)|
    ↓        ↓
   */

  return (
    <div
      className="relative w-full flex border"
      style={{ aspectRatio: "36 / 9" }}
    >
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
        {bookmarkEntriesCount !== undefined && (
          <Link
            to={R["/bookmarks"] + `?videoId=${video.id}&order=caption`}
            className="absolute right-1 top-1 px-1 py-0.5 rounded bg-black/75 text-white text-xs font-bold"
          >
            <div className="flex justify-center items-center gap-1">
              <div>{bookmarkEntriesCount}</div>
              <Bookmark size={12} />
            </div>
          </Link>
        )}
      </div>
      <div className="grow p-2 flex flex-col relative text-sm">
        <Link to={to} className="line-clamp-2 mb-2">
          {title}
        </Link>
        {/* TODO: use it as filtering in "/videos" */}
        <a
          href={"https://www.youtube.com/channel/" + channelId}
          target="_blank"
          className="line-clamp-1 text-gray-600 text-xs pr-8"
        >
          {author}
        </a>
        {actions && (
          <div className="absolute right-1 bottom-1 z-10">
            <PopoverSimple
              placement="bottom-end"
              reference={(context) => (
                <button
                  className={cls(
                    "antd-btn antd-btn-ghost",
                    context.open && "antd-btn-ghost-active"
                  )}
                  data-test="video-component-popover-button"
                >
                  <MoreVertical size={16} />
                </button>
              )}
              floating={
                <ul className="flex flex-col gap-2 p-2 w-48 text-sm">
                  {/* TODO: how to let `actions` close the popover? */}
                  {actions}
                </ul>
              }
            />
          </div>
        )}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black/[0.2]">
          <div className="antd-spin2 w-16"></div>
        </div>
      )}
    </div>
  );
}

// TODO: use antd-spin
export function Spinner(props: { className: string }) {
  return <div className={cls("antd-spin2", props.className)} />;
}

export function PaginationComponent({
  className = "",
  query = "",
  pagination,
}: {
  className?: string;
  query?: string;
  pagination: PaginationMetadata;
}) {
  const { first, previous, next, last } = toNewPages(pagination);
  if (query) query += "&";
  return (
    <div className={`${className} btn-group shadow-xl`} data-test="pagination">
      <Link
        to={"?" + query + toQuery(first)}
        className="btn btn-xs no-animation"
      >
        <ChevronsLeft size={14} />
      </Link>
      <Link
        to={"?" + query + toQuery(previous)}
        // TODO: think of better "disabled" state
        // className={`btn btn-xs no-animation ${!previous && "btn-disabled"}`}
        className="btn btn-xs no-animation"
      >
        <ChevronLeft size={14} />
      </Link>
      <div className="bg-neutral text-neutral-content font-semibold text-xs flex justify-center items-center px-2">
        {pagination.page}/{pagination.totalPage} ({pagination.total})
      </div>
      <Link
        to={"?" + query + toQuery(next)}
        className="btn btn-xs no-animation"
      >
        <ChevronRight size={14} />
      </Link>
      <Link
        to={"?" + query + toQuery(last)}
        className="btn btn-xs no-animation"
      >
        <ChevronsRight size={14} />
      </Link>
    </div>
  );
}

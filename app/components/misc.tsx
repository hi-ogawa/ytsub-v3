import { Transition } from "@headlessui/react";
import { Link } from "@remix-run/react";
import * as React from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
} from "react-feather";
import { PaginationMetadata, VideoTable } from "../db/models";
import { R } from "../misc/routes";
import { toNewPages } from "../utils/pagination";
import { toQuery } from "../utils/url-data";
import { parseVssId, toThumbnail } from "../utils/youtube";
import { Popover } from "./popover";

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
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center z-10 bg-black/[0.2]">
          <Spinner className="w-16 h-16" />
        </div>
      )}
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
          <div className="absolute right-1 top-1 px-1 py-0.5 rounded bg-black/75 text-white text-xs font-bold">
            <div className="flex justify-center items-center gap-1">
              <div>{bookmarkEntriesCount}</div>
              <Bookmark size={12} />
            </div>
          </div>
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
            <Popover
              placement="bottom-end"
              reference={({ props }) => (
                <button className="btn btn-sm btn-ghost btn-circle" {...props}>
                  <MoreVertical size={14} />
                </button>
              )}
              floating={({ open, props }) => (
                <Transition
                  show={open}
                  unmount={false}
                  className="transition duration-200"
                  enterFrom="scale-90 opacity-0"
                  enterTo="scale-100 opacity-100"
                  leaveFrom="scale-100 opacity-100"
                  leaveTo="scale-90 opacity-0"
                  {...props}
                >
                  <ul className="menu menu-compact rounded p-2 shadow w-48 bg-base-100 text-base-content text-sm">
                    {/* TODO: how to let `actions` close the popover? */}
                    {actions}
                  </ul>
                </Transition>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const Spinner: React.FC<{ className: string }> = (props) => {
  return (
    <div
      className={`${props.className} rounded-full animate-spin`}
      style={{
        border: "3px solid #999",
        borderLeft: "3px solid #ddd",
        borderTop: "3px solid #ddd",
      }}
    />
  );
};

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
    <div className={`${className} btn-group shadow-xl`}>
      <Link
        to={"?" + query + toQuery(first)}
        className="btn btn-xs no-animation"
      >
        <ChevronsLeft size={14} />
      </Link>
      <Link
        to={"?" + query + toQuery(previous)}
        className={`btn btn-xs no-animation ${!previous && "btn-disabled"}`}
      >
        <ChevronLeft size={14} />
      </Link>
      <div className="bg-neutral text-neutral-content font-semibold text-xs flex justify-center items-center px-2">
        {pagination.page}/{pagination.totalPage} ({pagination.total})
      </div>
      <Link
        to={"?" + query + toQuery(next)}
        className={`btn btn-xs no-animation ${!next && "btn-disabled"}`}
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

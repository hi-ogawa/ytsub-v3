import { Transition } from "@headlessui/react";
import { Link } from "@remix-run/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
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
  isLoading,
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
        <div className="absolute right-1 bottom-1 px-1 py-0.5 bg-black/75 text-white text-xs font-bold">
          <div>
            {code1} - {code2}
          </div>
        </div>
        {bookmarkEntriesCount !== undefined && (
          <Link
            to={R["/bookmarks"] + `?videoId=${video.id}&order=caption`}
            className="absolute right-1 top-1 px-1 py-0.5 bg-black/75 text-white text-xs font-bold"
          >
            <div className="flex justify-center items-center gap-1">
              <div>{bookmarkEntriesCount}</div>
              <span className="i-ri-bookmark-line w-3 h-3"></span>
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
          className="line-clamp-1 text-colorTextSecondary text-xs pr-8"
        >
          {author}
        </a>
        {actions && (
          <div className="absolute right-1 bottom-1">
            <PopoverSimple
              placement="bottom-end"
              reference={(context) => (
                <button
                  className={cls(
                    "antd-btn antd-btn-ghost i-ri-more-2-line w-5 h-5",
                    context.open && "text-colorPrimaryActive"
                  )}
                  data-test="video-component-popover-button"
                />
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
      <Transition
        show={Boolean(isLoading)}
        className="duration-500 opacity-60 antd-body antd-spin-overlay-16"
        enterFrom="opacity-0"
        enterTo="opacity-60"
        leaveFrom="opacity-60"
        leaveTo="opacity-0"
      />
    </div>
  );
}

export function PaginationComponent({
  query = "",
  pagination,
}: {
  query?: string;
  pagination: PaginationMetadata;
}) {
  const { page, totalPage, total } = pagination;
  const { first, previous, next, last } = toNewPages(pagination);
  if (query) query += "&";
  return (
    <div
      data-test="pagination"
      className="antd-floating flex items-center gap-2 px-2 py-1"
    >
      <Link
        className="antd-btn antd-btn-ghost flex items-center"
        to={"?" + query + toQuery(first)}
      >
        <span className="i-ri-rewind-mini-fill w-5 h-5"></span>
      </Link>
      <Link
        className="antd-btn antd-btn-ghost flex items-center"
        to={"?" + query + toQuery(previous)}
      >
        <span className="i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"></span>
      </Link>
      <span className="text-sm">
        {page} / {totalPage} ({total})
      </span>
      <Link
        className="antd-btn antd-btn-ghost flex items-center"
        to={"?" + query + toQuery(next)}
      >
        <span className="i-ri-play-mini-fill w-4 h-4"></span>
      </Link>
      <Link
        className="antd-btn antd-btn-ghost flex items-center"
        to={"?" + query + toQuery(last)}
      >
        <span className="i-ri-rewind-mini-fill w-5 h-5 rotate-[180deg]"></span>
      </Link>
    </div>
  );
}

export function QueryClientWrapper({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 5 * 60 * 1000,
            cacheTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {false && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

import type { FloatingContext } from "@floating-ui/react";
import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { Link } from "@remix-run/react";
import type { VideoTable } from "../db/models";
import { $R, Z_PAGINATION_QUERY } from "../misc/routes";
import { useUrlQuerySchema } from "../utils/loader-utils";
import { cls } from "../utils/misc";
import type { PaginationMetadata } from "../utils/pagination";
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
  actions?: React.ReactNode | ((context: FloatingContext) => React.ReactNode);
  isLoading?: boolean;
}) {
  const { id, videoId, title, author, channelId } = video;
  const to = $R["/videos/$id"]({ id });
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
          <div className="absolute right-1 top-1 px-1 py-0.5 bg-black/75 text-white text-xs font-bold">
            <div className="flex justify-center items-center gap-1">
              <div>{bookmarkEntriesCount}</div>
              <span className="i-ri-bookmark-line w-3 h-3"></span>
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
              floating={(context) => (
                <ul className="flex flex-col gap-2 p-2 w-48 text-sm">
                  {typeof actions === "function" ? actions(context) : actions}
                </ul>
              )}
            />
          </div>
        )}
      </div>
      <Transition
        show={Boolean(isLoading)}
        className="duration-500 antd-spin-overlay-16"
        {...transitionProps("opacity-0", "opacity-60")}
      />
    </div>
  );
}

// simpler wrapper for common transition props
export function transitionProps(from: string, to: string) {
  return {
    enterFrom: from,
    enterTo: to,
    leaveFrom: to,
    leaveTo: from,
  };
}

export function PaginationComponent({
  pagination,
}: {
  pagination: PaginationMetadata;
}) {
  const [{ page }, , mergeParams] = useUrlQuerySchema(Z_PAGINATION_QUERY);
  const { totalPage, total } = pagination;
  return (
    <div
      data-test="pagination"
      className="antd-floating flex items-center gap-2 px-2 py-1"
    >
      <Link
        className="antd-btn antd-btn-ghost flex items-center aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={page <= 1}
        to={"?" + mergeParams({ page: undefined })}
      >
        <span className="i-ri-rewind-mini-fill w-5 h-5"></span>
      </Link>
      <Link
        className="antd-btn antd-btn-ghost flex items-center aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={page <= 1}
        to={"?" + mergeParams({ page: page - 1 })}
      >
        <span className="i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"></span>
      </Link>
      <span className="text-sm">
        {page} / {totalPage} ({total})
      </span>
      <Link
        className="antd-btn antd-btn-ghost flex items-center aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={page >= totalPage}
        to={"?" + mergeParams({ page: page + 1 })}
      >
        <span className="i-ri-play-mini-fill w-4 h-4"></span>
      </Link>
      <Link
        className="antd-btn antd-btn-ghost flex items-center aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={page >= totalPage}
        to={"?" + mergeParams({ page: totalPage })}
      >
        <span className="i-ri-rewind-mini-fill w-5 h-5 rotate-[180deg]"></span>
      </Link>
    </div>
  );
}

//
// simple select input wrapper with convenient typing
//

export function SelectWrapper<T>({
  value,
  options,
  onChange,
  // convenient default when `T extends string`
  labelFn = String,
  keyFn = (value) => JSON.stringify({ value }), // wrap it so that `undefined` becomes `{}`
  ...selectProps
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  labelFn?: (value: T) => React.ReactNode;
  keyFn?: (value: T) => React.Key;
} & Omit<JSX.IntrinsicElements["select"], "value" | "onChange">) {
  return (
    <select
      value={options.indexOf(value)}
      onChange={(e) => onChange(options[Number(e.target.value)])}
      {...selectProps}
    >
      {options.map((option, i) => (
        <option key={keyFn(option)} value={i}>
          {labelFn(option)}
        </option>
      ))}
    </select>
  );
}

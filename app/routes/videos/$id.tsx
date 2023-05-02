import { Transition } from "@headlessui/react";
import { groupBy, sortBy, tinyassert, uniq } from "@hiogawa/utils";
import { isNil } from "@hiogawa/utils";
import { toArraySetState, useRafLoop } from "@hiogawa/utils-react";
import { Link, useNavigate } from "@remix-run/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  VirtualItem,
  Virtualizer,
  useVirtualizer,
} from "@tanstack/react-virtual";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import React from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { transitionProps } from "../../components/misc";
import { useModal } from "../../components/modal";
import { PopoverSimple } from "../../components/popover";
import { E, T, TT, db, findOne } from "../../db/drizzle-client.server";
import type { UserTable, VideoTable } from "../../db/models";
import { $R, ROUTE_DEF } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { useDocumentEvent } from "../../utils/hooks-client-utils";
import { intl } from "../../utils/intl";
import {
  useLeafLoaderData,
  useLoaderDataExtra,
  useRootLoaderData,
} from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls, zip } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionEntry } from "../../utils/types";
import {
  YoutubePlayer,
  YoutubePlayerOptions,
  stringifyTimestamp,
  usePlayerLoader,
} from "../../utils/youtube";

export const handle: PageHandle = {
  navBarTitle: () => "Watch",
  navBarMenu: () => <NavBarMenuComponent />,
};

//
// loader
//

type LoaderData = {
  video: VideoTable;
  query: z.infer<(typeof ROUTE_DEF)["/videos/$id"]["query"]>;
};

export const loader = makeLoader(async ({ ctx }) => {
  const params = ROUTE_DEF["/videos/$id"].params.parse(ctx.params);
  const query = ROUTE_DEF["/videos/$id"].query.parse(ctx.query);
  const video = await findOne(
    db.select().from(T.videos).where(E.eq(T.videos.id, params.id))
  );
  tinyassert(video);
  const loaderData: LoaderData = {
    video,
    query,
  };
  return loaderData;
});

//
// component
//

export default function DeafultComponent() {
  const { currentUser } = useRootLoaderData();
  const data = useLoaderDataExtra() as LoaderData;
  return <PageComponent currentUser={currentUser} {...data} />;
}

export function findCurrentEntry(
  entries: CaptionEntry[],
  time: number
): CaptionEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].begin <= time) {
      return entries[i];
    }
  }
  return;
}

interface BookmarkSelection {
  captionEntryIndex: number;
  side: number;
  offset: number;
  text: string;
}

function PageComponent({
  video,
  currentUser,
  query,
}: LoaderData & { currentUser?: UserTable }) {
  const [autoScrollState] = useAutoScrollState();
  const autoScroll = autoScrollState.includes(video.id);
  const [repeatingEntries, setRepeatingEntries, toggleRepeatingEntries] =
    useRepeatingEntries();
  React.useEffect(() => () => setRepeatingEntries([]), []); // clear state on page navigation

  // fetch caption entries on client
  const captionEntriesQuery = useQuery({
    ...trpc.videos_getCaptionEntries.queryOptions({ videoId: video.id }),
  });
  const captionEntries = React.useMemo(
    () => captionEntriesQuery.data ?? [],
    [captionEntriesQuery.data]
  );

  //
  // state
  //

  const [player, setPlayer] = React.useState<YoutubePlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentEntry, setCurrentEntry] = React.useState<CaptionEntry>();
  const [bookmarkState, setBookmarkState] = React.useState<BookmarkSelection>();

  //
  // query
  //

  // fetch all bookmark entries associated to this video
  const [highlightBookmark] = useAtom(highlightBookmarkStorageAtom);
  const highlightBookmarkEnabled = highlightBookmark && Boolean(currentUser);

  const bookmarkEntriesQueryOptions =
    trpc.videos_getBookmarkEntries.queryOptions({ videoId: video.id });

  const bookmarkEntriesQuery = useQuery({
    ...bookmarkEntriesQueryOptions,
    enabled: highlightBookmarkEnabled,
  });

  const queryClient = useQueryClient();

  const newBookmarkMutation = useMutation({
    ...trpc.bookmarks_create.mutationOptions(),
    onSuccess: (newBookmark) => {
      toast.success("Bookmark success");

      // mutate query cache instead of refetch
      queryClient.setQueryData(bookmarkEntriesQueryOptions.queryKey, (prev) => [
        ...(prev as TT["bookmarkEntries"][]),
        newBookmark,
      ]);
    },
    onError: () => {
      toast.error("Bookmark failed");
    },
    onSettled: () => {
      setBookmarkState(undefined);
    },
  });

  //
  // handlers
  //

  useRafLoop(() => {
    if (!player) return;

    const isPlaying = player.getPlayerState() === 1;
    setIsPlaying(isPlaying);

    if (!isPlaying) return;

    const currentTime = player.getCurrentTime();
    let nextEntry = findCurrentEntry(captionEntries, currentTime);

    // repeat mode
    if (repeatingEntries.length > 0) {
      // update player
      const begin = Math.min(...repeatingEntries.map((entry) => entry.begin));
      const end = Math.max(...repeatingEntries.map((entry) => entry.end));
      if (currentTime < begin || end < currentTime) {
        player.seekTo(begin);
      }

      // predict `nextEntry`
      if (
        nextEntry &&
        currentEntry &&
        nextEntry.index === currentEntry.index + 1 &&
        repeatingEntries.at(-1) === currentEntry
      ) {
        nextEntry = repeatingEntries[0];
      }
    }

    // auto scroll subtitle list
    if (
      autoScroll &&
      nextEntry &&
      nextEntry !== currentEntry &&
      virtualizer.scrollElement
    ) {
      const { scrollTop, clientHeight } = virtualizer.scrollElement;
      const currentCenter = scrollTop + clientHeight / 2;
      const threshold = clientHeight / 6;
      const items = virtualizer.getVirtualItems();
      const currentItem = items.find((item) => item.index === nextEntry?.index);
      if (
        !currentItem ||
        Math.abs(currentItem.start - currentCenter) > threshold
      ) {
        virtualizer.scrollToIndex(nextEntry.index, {
          align: "center",
          behavior: "auto",
        });
      }
    }

    setCurrentEntry(nextEntry);
  });

  function onClickEntryPlay(entry: CaptionEntry, toggle: boolean) {
    if (!player) return;

    // No-op if some text is selected (e.g. for google translate extension)
    if (document.getSelection()?.toString()) return;

    if (toggle && entry === currentEntry) {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } else {
      player.seekTo(entry.begin);
      player.playVideo();
    }
  }

  function onClickBookmark() {
    if (!bookmarkState) return;
    newBookmarkMutation.mutate({
      videoId: video.id,
      captionEntryId: captionEntries[bookmarkState.captionEntryIndex].id,
      text: bookmarkState.text,
      side: bookmarkState.side,
      offset: bookmarkState.offset,
    });
    document.getSelection()?.removeAllRanges();
  }

  function onCancelBookmark() {
    document.getSelection()?.removeAllRanges();
    setBookmarkState(undefined);
  }

  //
  // effects
  //

  React.useEffect(() => {
    if (!isNil(query.index) && query.index < captionEntries.length) {
      // smooth scroll ends up wrong positions due to over-estimation by `estimateSize`.
      virtualizer.scrollToIndex(query.index, {
        align: "center",
        behavior: "auto",
      });
    }
  }, [query.index, captionEntries]);

  useDocumentEvent("selectionchange", () => {
    const selection = document.getSelection() ?? undefined;
    setBookmarkState(selection && extractBookmarkSelection(selection));
  });

  //
  // perf: virtualize subtitle scroll list (cf. https://github.com/TanStack/virtual/blob/623ac63988f16e6ea6755d8b2e190c123134501c/examples/react/dynamic/src/main.tsx)
  //
  const scrollElementRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: captionEntries.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (_index) => 100, // rough estimation
    overscan: 5,
  });

  return (
    <LayoutComponent
      virtualizer={virtualizer}
      scrollElementRef={scrollElementRef}
      player={
        <>
          <PlayerComponent
            defaultOptions={{ videoId: video.videoId }}
            onLoad={setPlayer}
          />
        </>
      }
      subtitles={
        <>
          {captionEntries.length > 0 && (
            <CaptionEntriesComponent
              virtualizer={virtualizer}
              entries={captionEntries}
              bookmarkEntries={
                highlightBookmarkEnabled && bookmarkEntriesQuery.isSuccess
                  ? bookmarkEntriesQuery.data
                  : []
              }
              currentEntry={currentEntry}
              repeatingEntries={repeatingEntries}
              onClickEntryPlay={onClickEntryPlay}
              onClickEntryRepeat={(entry) => toggleRepeatingEntries(entry)}
              isPlaying={isPlaying}
              focusedIndex={query.index}
            />
          )}
          <Transition
            show={captionEntriesQuery.isLoading}
            className="duration-500 antd-body antd-spin-overlay-10"
            {...transitionProps("opacity-0", "opacity-50")}
          />
        </>
      }
      bookmarkActions={
        currentUser &&
        currentUser.id === video.userId && (
          <Transition
            show={!!bookmarkState || newBookmarkMutation.isLoading}
            className="absolute bottom-0 right-0 flex gap-2 p-1.5 transition duration-300 z-10"
            enterFrom="scale-30 opacity-0"
            enterTo="scale-100 opacity-100"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-30 opacity-0"
          >
            {/* workaround transparent antd-btn-text by opaque wrapping */}
            <div className="w-12 h-12 rounded-full antd-body">
              <button
                className="antd-btn antd-btn-text antd-floating light:bg-colorBgContainerDisabled dark:bg-colorBgSpotlight w-12 h-12 rounded-full flex justify-center items-center"
                onClick={onCancelBookmark}
              >
                <span className="i-ri-close-line w-6 h-6" />
              </button>
            </div>
            <button
              data-test="new-bookmark-button"
              className="antd-btn !antd-btn-primary antd-floating w-12 h-12 rounded-full flex justify-center items-center"
              onClick={onClickBookmark}
            >
              <span
                className={cls(
                  !newBookmarkMutation.isLoading
                    ? "i-ri-bookmark-line"
                    : "antd-spin",
                  "w-6 h-6"
                )}
              />
            </button>
          </Transition>
        )
      }
    />
  );
}

function LayoutComponent(props: {
  player: React.ReactNode;
  subtitles: React.ReactNode;
  bookmarkActions: React.ReactNode;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollElementRef: React.RefObject<HTMLDivElement>;
}) {
  //
  // - Mobile layout
  //
  //    +-----------+
  //    |  PLAYER   |    fixed aspect ratio 16 / 9
  //    +-----------+
  //    | SUBTITLES |    grow
  //    +-----------+
  //
  // - Desktop layout
  //
  //    +--------------+-----------+
  //    |              |           |
  //    |    PLAYER    | SUBTITLES |
  //    |              |           |
  //    +--------------+-----------+
  //         grow        1/3 width
  //
  return (
    <div className="h-full w-full flex flex-col md:flex-row md:gap-2 md:p-2">
      <div className="flex-none md:grow">{props.player}</div>
      <div className="flex flex-col flex-[1_0_0] md:flex-none md:w-1/3 border-t md:border relative">
        <div
          className="flex-[1_0_0] h-full overflow-y-auto"
          ref={props.scrollElementRef}
        >
          {props.subtitles}
        </div>
        {props.bookmarkActions}
      </div>
    </div>
  );
}

function PlayerComponent({
  defaultOptions,
  onLoad,
  onError,
}: {
  defaultOptions: YoutubePlayerOptions;
  onLoad: (player: YoutubePlayer) => void;
  onError?: (e: unknown) => void;
}) {
  const { ref, isLoading } = usePlayerLoader(defaultOptions, {
    onSuccess: onLoad,
    onError,
  });

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-md md:max-w-none">
        <div className="relative pt-[56.2%]">
          <div className="absolute top-0 w-full h-full" ref={ref} />
        </div>
        <Transition
          show={isLoading}
          className="duration-500 antd-body antd-spin-overlay-30"
          {...transitionProps("opacity-0", "opacity-100")}
        />
      </div>
    </div>
  );
}

function CaptionEntriesComponent({
  entries,
  bookmarkEntries,
  focusedIndex,
  ...props
}: {
  entries: TT["captionEntries"][];
  bookmarkEntries: TT["bookmarkEntries"][];
  focusedIndex?: number;
  currentEntry?: CaptionEntry;
  repeatingEntries: CaptionEntry[];
  onClickEntryPlay: (entry: CaptionEntry, toggle: boolean) => void;
  onClickEntryRepeat: (entry: CaptionEntry) => void;
  isPlaying: boolean;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}) {
  const virtualItems = props.virtualizer.getVirtualItems();

  const bookmarkEntryMap = React.useMemo(
    () => groupBy(bookmarkEntries, (row) => row.captionEntryId),
    [bookmarkEntries]
  );

  return (
    <div
      className="flex flex-col"
      style={{
        position: "relative",
        height: props.virtualizer.getTotalSize(),
      }}
    >
      {/* TODO: compare with the other approach of offsetting all child elements by `virtualItem.start` */}
      <div
        className="flex flex-col gap-1.5 px-1.5"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${virtualItems[0].start}px)`,
        }}
      >
        {virtualItems.map((item) => renderItem(item))}
      </div>
    </div>
  );

  //
  // helpers
  //

  function renderItem(item: VirtualItem) {
    const entry = entries[item.index];
    return (
      <CaptionEntryComponent
        key={item.key}
        entry={entry}
        bookmarkEntries={bookmarkEntryMap.get(entry.id)}
        isFocused={focusedIndex === item.index}
        virtualItem={item}
        // workaround disappearing bottom margin (paddingEnd option doesn't seem to work)
        isActualLast={item.index === entries.length - 1}
        {...props}
      />
    );
  }
}

export function CaptionEntryComponent({
  entry,
  currentEntry,
  repeatingEntries = [],
  onClickEntryPlay,
  onClickEntryRepeat,
  isPlaying,
  isFocused,
  videoId,
  border = true,
  bookmarkEntries,
  // virtualized list
  virtualizer,
  virtualItem,
  isActualLast,
}: {
  entry: CaptionEntry;
  currentEntry?: CaptionEntry;
  repeatingEntries?: CaptionEntry[];
  onClickEntryPlay: (entry: CaptionEntry, toggle: boolean) => void;
  onClickEntryRepeat: (entry: CaptionEntry) => void;
  isPlaying: boolean;
  isFocused?: boolean;
  videoId?: number;
  border?: boolean;
  bookmarkEntries?: TT["bookmarkEntries"][];
  // virtualized list
  virtualizer?: Virtualizer<HTMLDivElement, Element>;
  virtualItem?: VirtualItem;
  isActualLast?: boolean;
}) {
  const { begin, end, text1, text2 } = entry;
  const timestamp = [begin, end].map(stringifyTimestamp).join(" - ");

  const isCurrentEntry = entry === currentEntry;
  const isRepeating = repeatingEntries.includes(entry);
  const isEntryPlaying = isCurrentEntry && isPlaying;

  return (
    <div
      className={cls(
        "w-full flex flex-col p-1 px-2 gap-1",
        border && "border",
        border && isEntryPlaying && "ring-2 ring-colorPrimaryBorder",
        border && isCurrentEntry && "border-colorPrimary",
        // quick virtualizer padding workaround
        virtualItem?.index === 0 && "mt-1.5",
        isActualLast && "mb-1.5"
      )}
      ref={virtualizer?.measureElement}
      {...{ [BOOKMARK_DATA_ATTR["data-index"]]: virtualItem?.index }}
    >
      <div className="flex items-center text-colorTextSecondary gap-2 text-xs">
        {isFocused && (
          <span className="i-ri-bookmark-line w-3 h-3 text-colorPrimary" />
        )}
        <span className="flex-1" />
        <div>{timestamp}</div>
        {!isNil(videoId) && (
          <Link
            to={$R["/videos/$id"]({ id: videoId }, { index: entry.index })}
            className="antd-btn antd-btn-ghost i-ri-vidicon-line w-4 h-4"
            data-test="caption-entry-component__video-link"
          />
        )}
        <a
          // prettier-ignore
          href={`https://10fastfingers.com/widget/typingtest?dur=600&rand=0&words=${encodeURIComponent(entry.text1)}`}
          // use "media-mouse" as keyboard detection heuristics https://github.com/w3c/csswg-drafts/issues/3871
          className="antd-btn antd-btn-ghost i-ri-keyboard-line w-4 h-4 hidden media-mouse:inline"
          target="_blank"
        />
        <button
          className={cls(
            `antd-btn antd-btn-ghost i-ri-repeat-line w-3 h-3`,
            isRepeating && "text-colorPrimary"
          )}
          onClick={() => onClickEntryRepeat(entry)}
        />
        <button
          className={cls(
            `antd-btn antd-btn-ghost i-ri-play-line w-4 h-4`,
            isEntryPlaying && "text-colorPrimary"
          )}
          onClick={() => onClickEntryPlay(entry, false)}
        />
      </div>
      <div
        className="flex cursor-pointer text-sm"
        onClick={() => onClickEntryPlay(entry, true)}
      >
        <div
          className="flex-1 pr-2 border-r"
          {...{ [BOOKMARK_DATA_ATTR["data-side"]]: "0" }}
        >
          <HighlightText
            text={text1}
            highlights={bookmarkEntries?.filter((e) => e.side === 0) ?? []}
          />
        </div>
        <div
          className="flex-1 pl-2"
          {...{ [BOOKMARK_DATA_ATTR["data-side"]]: "1" }}
        >
          <HighlightText
            text={text2}
            highlights={bookmarkEntries?.filter((e) => e.side === 1) ?? []}
          />
        </div>
      </div>
    </div>
  );
}

function HighlightText({
  text,
  highlights,
}: {
  text: string;
  highlights: { offset: number; text: string }[];
}) {
  const partitions = partitionRanges(
    text.length,
    highlights.map((h) => [h.offset, h.offset + h.text.length])
  );
  return (
    <>
      {partitions.map(([highlight, [start, end]]) => (
        <span
          key={start}
          className={cls(highlight && "text-colorPrimaryText")}
          {...{ [BOOKMARK_DATA_ATTR["data-offset"]]: start }}
        >
          {text.slice(start, end)}
        </span>
      ))}
    </>
  );
}

// export for testing
export function partitionRanges(
  total: number,
  ranges: [number, number][]
): [boolean, [number, number]][] {
  const boundaries = uniq(sortBy(ranges.flat().concat([0, total]), (x) => x));
  return zip(boundaries, boundaries.slice(1)).map((a) => [
    ranges.some((b) => b[0] <= a[0] && a[1] <= b[1]),
    a,
  ]);
}

const BOOKMARK_DATA_ATTR = z.enum([
  "data-index", // this is used for virtualizer too
  "data-side",
  "data-offset",
]).enum;

// desperate DOM manipulation to find selected data for new bookmark creation
// TODO: make type-safe data attributes
function extractBookmarkSelection(
  selection: Selection
): BookmarkSelection | undefined {
  // skip empty selection
  const text = selection.toString();
  if (!text.trim()) return;
  if (selection.rangeCount === 0) return;

  // manipulate on Range
  const selectionRange = selection.getRangeAt(0);
  if (selectionRange.collapsed) return;

  const { startContainer, startOffset, endContainer } = selectionRange;

  // check selection is text node
  if (
    startContainer.nodeType !== document.TEXT_NODE ||
    endContainer.nodeType !== document.TEXT_NODE
  )
    return;

  // check "data-offset" element
  const startEl = startContainer.parentElement;
  const endEl = endContainer.parentElement;
  const dataOffset = startEl?.getAttribute(BOOKMARK_DATA_ATTR["data-offset"]);
  if (!startEl || !endEl || !dataOffset) return;

  // check start/end are contained in "data-side" element
  const dataSideEl = startEl.parentElement;
  const dataSide = dataSideEl?.getAttribute(BOOKMARK_DATA_ATTR["data-side"]);
  if (!dataSideEl || !dataSide || startEl.parentElement !== endEl.parentElement)
    return;

  // check "data-index" element
  const dataIndexEl = dataSideEl.parentElement?.parentElement;
  const dataIndex = dataIndexEl?.getAttribute(BOOKMARK_DATA_ATTR["data-index"]);
  console.log({ startEl, endEl, dataSideEl, dataIndexEl });
  if (!dataIndexEl || !dataIndex) return;

  return {
    captionEntryIndex: Number(dataIndex),
    side: Number(dataSide),
    offset: Number(dataOffset) + startOffset,
    text,
  };
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  const { currentUser } = useRootLoaderData();
  const { video } = useLeafLoaderData() as LoaderData;
  const [autoScrollState, toggleAutoScrollState] = useAutoScrollState();
  const [repeatingEntries, setRepeatingEntries] = useRepeatingEntries();
  const [highlightBookmark, setHighlightBookmark] = useAtom(
    highlightBookmarkStorageAtom
  );
  const modal = useModal();

  const navigate = useNavigate();

  const lastBookmarkQuery = useMutation({
    ...trpc.videos_getLastBookmark.mutationOptions(),
    onSuccess: (data) => {
      if (data) {
        modal.setOpen(false);
        navigate(
          $R["/videos/$id"](
            { id: video.id },
            { index: data.captionEntries.index }
          ),
          { replace: true }
        );
      } else {
        toast.error("No bookmark is found");
      }
    },
  });

  return (
    <>
      <div className="flex items-center">
        <PopoverSimple
          placement="bottom-end"
          reference={
            <button
              className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
              data-testid="video-menu-reference"
            />
          }
          floating={(context) => (
            <ul className="flex flex-col gap-2 p-2 w-[180px] text-sm">
              <li>
                <button
                  className="w-full antd-menu-item p-2 flex"
                  onClick={() => modal.setOpen(true)}
                >
                  Details
                </button>
              </li>
              <li>
                <button
                  className="w-full antd-menu-item p-2 flex gap-2"
                  disabled={!currentUser}
                  onClick={() => setHighlightBookmark((prev) => !prev)}
                >
                  Show bookmarks
                  {highlightBookmark && (
                    <span className="i-ri-check-line w-5 h-5"></span>
                  )}
                </button>
              </li>
              <li>
                <button
                  className="w-full antd-menu-item p-2 flex gap-2"
                  onClick={() => toggleAutoScrollState(video.id)}
                >
                  Auto scroll
                  {autoScrollState.includes(video.id) && (
                    <span className="i-ri-check-line w-5 h-5"></span>
                  )}
                </button>
              </li>
              <li>
                <button
                  className="w-full antd-menu-item p-2 flex"
                  disabled={repeatingEntries.length === 0}
                  onClick={() => {
                    setRepeatingEntries([]);
                    context.onOpenChange(false);
                  }}
                >
                  Clear Repeat
                </button>
              </li>
            </ul>
          )}
        />
      </div>
      <modal.Wrapper>
        <div className="flex flex-col gap-2 p-4 relative">
          <div className="text-lg">Details</div>
          <label className="flex flex-col gap-1">
            <span className="text-colorTextLabel">Title</span>
            <input
              type="text"
              className="antd-input p-1 bg-colorBgContainerDisabled"
              readOnly
              value={video.title}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-colorTextLabel">Author</span>
            <input
              type="text"
              className="antd-input p-1 bg-colorBgContainerDisabled"
              readOnly
              value={video.author}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-colorTextLabel">Imported at</span>
            <input
              type="text"
              className="antd-input p-1 bg-colorBgContainerDisabled"
              readOnly
              value={intl.formatDate(video.createdAt, {
                dateStyle: "long",
                timeStyle: "long",
                hour12: false,
              })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-colorTextLabel">Bookmark count</span>
            <input
              type="text"
              className="antd-input p-1 bg-colorBgContainerDisabled"
              readOnly
              value={video.bookmarkEntriesCount}
            />
          </label>
          <div className="border-t my-1"></div>
          <h4>Shortcuts</h4>
          <div className="flex flex-col sm:flex-row gap-2 text-sm">
            <button
              className={cls(
                "antd-btn antd-btn-default px-2 py-0.5",
                lastBookmarkQuery.isLoading && "antd-btn-loading"
              )}
              onClick={() => {
                lastBookmarkQuery.mutate({ videoId: video.id });
              }}
            >
              Go to Last Bookmark
            </button>
            <Link
              className="antd-btn antd-btn-default px-2 py-0.5 flex justify-center"
              to={$R["/videos/new"](null, { videoId: video.videoId })}
            >
              Change Languages
            </Link>
          </div>
        </div>
      </modal.Wrapper>
    </>
  );
}

//
// page local state
//

const repeatingEntriesAtom = atom(new Array<CaptionEntry>());

function useRepeatingEntries() {
  const [state, setState] = useAtom(repeatingEntriesAtom);
  return [state, setState, toArraySetState(setState).toggle] as const;
}

const autoScrollStorageAtom = atomWithStorage(
  "ytsub:video-subtitle-auto-scroll",
  Array<number>()
);

function useAutoScrollState() {
  const [state, setState] = useAtom(autoScrollStorageAtom);
  return [state, toArraySetState(setState).toggle] as const;
}

const highlightBookmarkStorageAtom = atomWithStorage(
  "ytsub:video-highlight-bookmark",
  false
);

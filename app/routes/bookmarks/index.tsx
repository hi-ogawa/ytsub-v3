import { Transition } from "@headlessui/react";
import { typedBoolean } from "@hiogawa/utils";
import { toArraySetState, useRafLoop } from "@hiogawa/utils-react";
import { Link, NavLink } from "@remix-run/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import React from "react";
import type { z } from "zod";
import { CollapseTransition } from "../../components/collapse";
import { transitionProps } from "../../components/misc";
import { PopoverSimple } from "../../components/popover";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  VideoTable,
} from "../../db/models";
import { $R, ROUTE_DEF } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import {
  useLeafLoaderData,
  useLoaderDataExtra,
} from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionEntry } from "../../utils/types";
import { YoutubePlayer, usePlayerLoader } from "../../utils/youtube";
import { CaptionEntryComponent, findCurrentEntry } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: () => "Bookmarks",
  navBarMenu: () => <NavBarMenuComponent />,
};

//
// loader
//

interface LoaderData {
  query: z.infer<(typeof ROUTE_DEF)["/bookmarks"]["query"]>;
}

// TODO: tweak shouldRevalidate
export const loader = makeLoader(async ({ ctx }) => {
  await ctx.requireUser();
  const query = ROUTE_DEF["/bookmarks"].query.parse(ctx.query);
  const loaderData: LoaderData = { query };
  return loaderData;
});

//
// component
//

export default function DefaultComponent() {
  const { query } = useLoaderDataExtra() as LoaderData;

  const bookmarkEntriesQuery = useInfiniteQuery({
    ...trpc.bookmarks_index.infiniteQueryOptions(
      {
        q: query.q,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        setPageParam: (input, pageParam) => ({
          ...input,
          cursor: pageParam as any,
        }),
      }
    ),
    keepPreviousData: true,
  });
  const rows = bookmarkEntriesQuery.data?.pages.flatMap((page) => page.rows);

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2 relative">
            <div className="flex py-1">
              {/* TODO: client navigation */}
              <form>
                <label className="relative flex items-center">
                  <span className="absolute text-colorTextSecondary ml-2 i-ri-search-line w-4 h-4"></span>
                  <input
                    className="antd-input pl-7 py-0.5"
                    name={ROUTE_DEF["/bookmarks"].query.keyof().enum.q}
                    type="text"
                    placeholder="Search text..."
                    defaultValue={query.q}
                  />
                </label>
              </form>
            </div>
            {rows?.map((row) => (
              <BookmarkEntryComponent
                key={row.bookmarkEntries.id}
                video={row.videos}
                captionEntry={row.captionEntries}
                bookmarkEntry={row.bookmarkEntries}
                showAutoplay
              />
            ))}
            {bookmarkEntriesQuery.hasNextPage && (
              <button
                className={cls(
                  "antd-btn antd-btn-default p-1 text-sm",
                  bookmarkEntriesQuery.isFetchingNextPage && "antd-btn-loading"
                )}
                onClick={() => bookmarkEntriesQuery.fetchNextPage()}
              >
                Load more
              </button>
            )}
            <Transition
              show={bookmarkEntriesQuery.isInitialLoading}
              className="absolute inset-0 duration-500 antd-body"
              {...transitionProps("opacity-0", "opacity-50")}
            >
              <div className="mx-auto mt-[200px] antd-spin h-18"></div>
            </Transition>
          </div>
        </div>
      </div>
    </>
  );
}

export function BookmarkEntryComponent({
  video,
  captionEntry,
  bookmarkEntry,
  showAutoplay,
  isLoading,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  showAutoplay?: boolean; // TODO: always true?
  isLoading?: boolean; // for /decks/$id/practice
}) {
  let [open, setOpen] = React.useState(false);
  let [autoplay, setAutoplay] = React.useState(false);

  function onClickAutoPlay() {
    setAutoplay(true);
    setOpen(!open);
  }

  return (
    <div className="border flex flex-col" data-test="bookmark-entry">
      <div
        className={cls(
          "flex items-center p-2 gap-2",
          open && "border-b border-dashed"
        )}
      >
        <button
          className={cls(
            "antd-btn antd-btn-ghost i-ri-arrow-down-s-line w-5 h-5",
            open && "rotate-180"
          )}
          onClick={() => setOpen(!open)}
        />
        <div
          className="flex-1 text-sm cursor-pointer"
          onClick={() => setOpen(!open)}
          data-test="bookmark-entry-text"
        >
          {bookmarkEntry.text}
        </div>
        {showAutoplay && (
          <button
            className={cls(
              "antd-btn antd-btn-ghost w-5 h-5",
              isLoading ? "antd-spin" : "i-ri-play-line"
            )}
            onClick={onClickAutoPlay}
          />
        )}
        {/* TODO: ability to delete */}
        <button
          className="antd-btn antd-btn-ghost i-ri-close-line w-5 h-5 hidden"
          onClick={() => {}}
        />
      </div>
      <CollapseTransition show={open} className="duration-300 overflow-hidden">
        <MiniPlayer
          video={video}
          captionEntry={captionEntry}
          bookmarkEntries={[bookmarkEntry]}
          autoplay={autoplay}
          defaultIsRepeating={autoplay}
        />
      </CollapseTransition>
    </div>
  );
}

// TODO: refactor almost same logic from /videos/$id
export function MiniPlayer({
  video,
  captionEntry: initialEntry,
  bookmarkEntries,
  autoplay,
  defaultIsRepeating,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntries?: TT["bookmarkEntries"][];
  autoplay: boolean;
  defaultIsRepeating: boolean;
}) {
  const [player, setPlayer] = React.useState<YoutubePlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentEntry, setCurrentEntry] = React.useState<CaptionEntry>();
  const [repeatingEntries, setRepeatingEntries] = React.useState<
    CaptionEntry[]
  >(() => (defaultIsRepeating ? [initialEntry] : []));

  // keep track of indices and derive caption entries from query data
  const [captionEntryIndices, setCaptionEntryIndices] = React.useState([
    initialEntry.index,
  ]);

  //
  // fetch all caption entries on client after `loadNeighbor`
  // but rely on `initialEntry` until then.
  //

  const [queryEnabled, setQueryEnabled] = React.useState(false);

  const captionEntriesQuery = useQuery({
    ...trpc.videos_getCaptionEntries.queryOptions({ videoId: video.id }),
    enabled: queryEnabled,
  });

  const captionEntries = React.useMemo(() => {
    const entries = captionEntriesQuery.data ?? [];
    entries[initialEntry.index] = initialEntry; // trick to make `initialEntry` stable
    return captionEntryIndices.map((i) => entries.at(i)).filter(typedBoolean);
  }, [captionEntriesQuery.data, initialEntry, captionEntryIndices]);

  // auto update repeating entries
  React.useEffect(() => {
    if (captionEntries.length >= 2) {
      setRepeatingEntries([captionEntries.at(0)!, captionEntries.at(-1)!]);
    }
  }, [captionEntries]);

  function loadNeighbor(direction: "previous" | "next") {
    setQueryEnabled(true);
    setCaptionEntryIndices((prev) =>
      direction === "previous"
        ? [prev.at(0)! - 1, ...prev]
        : [...prev, prev.at(-1)! + 1]
    );
  }

  //
  // handlers
  //

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

  //
  // effects
  //

  const playerLoader = usePlayerLoader(
    {
      videoId: video.videoId,
      playerVars: {
        start: Math.max(0, Math.floor(initialEntry.begin) - 1),
      },
    },
    {
      onSuccess: (player) => {
        setPlayer(player);
        // autoplay manually since it seems playerVars.autoplay doesn't work for mobile
        if (autoplay) {
          player.playVideo();
        }
      },
    }
  );

  useRafLoop(() => {
    if (!player) return;

    const isPlaying = player.getPlayerState() === 1;
    setIsPlaying(isPlaying);

    if (!isPlaying) return;

    const currentTime = player.getCurrentTime();
    let nextEntry = findCurrentEntry(captionEntries, currentTime);

    // small hack since above `findCurrentEntry` assumes all caption entries are available
    if (nextEntry && nextEntry.end < currentTime) {
      nextEntry = undefined;
    }

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

    setCurrentEntry(nextEntry);
  });

  return (
    <div className="w-full flex flex-col items-center p-2 gap-2">
      <div className="w-full flex justify-start gap-1 px-1 text-xs">
        <button
          className="antd-btn antd-btn-ghost w-4 h-4 i-ri-upload-line"
          disabled={captionEntryIndices.at(0) === 0}
          onClick={() => loadNeighbor("previous")}
        />
        <button
          className="antd-btn antd-btn-ghost w-4 h-4 i-ri-download-line"
          disabled={
            captionEntryIndices.at(-1) ===
            captionEntriesQuery.data?.at(-1)?.index
          }
          onClick={() => loadNeighbor("next")}
        />
        {captionEntriesQuery.isFetching && (
          <div className="antd-spin h-4"></div>
        )}
      </div>
      {captionEntries.map((captionEntry) => (
        <CaptionEntryComponent
          key={captionEntry.id}
          entry={captionEntry}
          currentEntry={currentEntry}
          repeatingEntries={repeatingEntries}
          onClickEntryPlay={onClickEntryPlay}
          onClickEntryRepeat={toArraySetState(setRepeatingEntries).toggle}
          isPlaying={isPlaying}
          videoId={video.id}
          bookmarkEntries={
            captionEntry === initialEntry ? bookmarkEntries : undefined
          }
          isFocused={captionEntry === initialEntry}
        />
      ))}
      <div className="relative w-full">
        <div className="relative pt-[56.2%]">
          <div
            className="absolute top-0 w-full h-full"
            ref={playerLoader.ref}
          />
        </div>
        <Transition
          show={playerLoader.isLoading}
          className="duration-500 antd-body antd-spin-overlay-20"
          {...transitionProps("opacity-0", "opacity-100")}
        />
      </div>
    </div>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  const { query } = useLeafLoaderData() as LoaderData;
  const isFilterActive = Boolean(query.q);

  return (
    <>
      <div className="flex items-center">
        <PopoverSimple
          placement="bottom-end"
          reference={
            <button
              className={cls(
                "antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6",
                isFilterActive && "text-colorPrimary"
              )}
            />
          }
          floating={(context) => (
            <ul className="flex flex-col gap-2 p-2 w-[160px] text-sm">
              <BookmarksMenuItems
                onClickItem={() => context.onOpenChange(false)}
              />
              <li className={cls(!isFilterActive && "hidden")}>
                <Link
                  className="w-full antd-menu-item flex items-center gap-2 p-2"
                  to={$R["/bookmarks"]()}
                  onClick={() => context.onOpenChange(false)}
                >
                  <span className="i-ri-close-line w-5 h-5"></span>
                  Clear Filter
                </Link>
              </li>
            </ul>
          )}
        />
      </div>
    </>
  );
}

export function BookmarksMenuItems({
  onClickItem,
}: {
  onClickItem: () => void;
}) {
  const items = [
    {
      to: $R["/bookmarks"](),
      children: (
        <>
          <span className="i-ri-bookmark-line w-6 h-6"></span>
          Bookmarks
        </>
      ),
    },
    {
      to: $R["/bookmarks/history-chart"](),
      children: (
        <>
          <span className="i-ri-bar-chart-line w-6 h-6"></span>
          Chart
        </>
      ),
    },
  ];

  return (
    <>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            className={({ isActive }) =>
              cls(
                "w-full antd-menu-item flex items-center gap-2 p-2",
                isActive && "antd-menu-item-active"
              )
            }
            end
            onClick={onClickItem}
            {...item}
          />
        </li>
      ))}
    </>
  );
}

import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import { isNil } from "@hiogawa/utils";
import { useRafLoop } from "@hiogawa/utils-react";
import {
  Form,
  Link,
  ShouldReloadFunction,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import {
  VirtualItem,
  Virtualizer,
  useVirtualizer,
} from "@tanstack/react-virtual";
import React from "react";
import {
  Bookmark,
  MoreVertical,
  Play,
  Repeat,
  Save,
  Video,
  X,
} from "react-feather";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Spinner } from "../../components/misc";
import { Popover } from "../../components/popover";
import { useSnackbar } from "../../components/snackbar";
import {
  CaptionEntryTable,
  Q,
  UserTable,
  VideoTable,
  getVideoAndCaptionEntries,
} from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize, useSelection } from "../../utils/hooks";
import { useYoutubeIframeApi } from "../../utils/hooks";
import { useLeafLoaderData, useRootLoaderData } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionEntry } from "../../utils/types";
import { toForm } from "../../utils/url-data";
import {
  YoutubePlayer,
  YoutubePlayerOptions,
  stringifyTimestamp,
} from "../../utils/youtube";
import { zStringToInteger, zStringToMaybeInteger } from "../../utils/zod-utils";
import type { NewBookmark } from "../bookmarks/new";

export const handle: PageHandle = {
  navBarTitle: () => "Watch",
  navBarMenu: () => <NavBarMenuComponent />,
};

//
// loader
//

const SCHEMA = z.object({
  id: zStringToInteger,
});

type LoaderData = { video: VideoTable; captionEntries: CaptionEntryTable[] };

export const loader = makeLoader(Controller, async function () {
  const parsed = SCHEMA.safeParse(this.args.params);
  if (parsed.success) {
    const { id } = parsed.data;
    const data: LoaderData | undefined = await getVideoAndCaptionEntries(id);
    if (data) {
      return this.serialize(data);
    }
  }
  this.flash({
    content: "Invalid Video ID",
    variant: "error",
  });
  return redirect(R["/"]);
});

export const unstable_shouldReload: ShouldReloadFunction = ({ submission }) => {
  if (submission?.action === R["/bookmarks/new"]) {
    return false;
  }
  return true;
};

//
// action
//

export const action = makeLoader(Controller, async function () {
  if (this.request.method === "DELETE") {
    const parsed = SCHEMA.safeParse(this.args.params);
    if (parsed.success) {
      const { id } = parsed.data;
      const user = await this.currentUser();
      if (user) {
        const video = await Q.videos().where({ id, userId: user.id }).first();
        if (video) {
          await Promise.all([
            Q.videos().delete().where({ id, userId: user.id }),
            Q.captionEntries().delete().where("videoId", id),
            Q.bookmarkEntries().delete().where("videoId", id),
          ]);
          // return `type` so that `useFetchers` can identify where the response is from
          return { type: "DELETE /videos/$id", success: true };
        }
      }
    }
  }
  return {
    type: "DELETE /videos/$id",
    success: false,
    message: "invalid request",
  };
});

//
// component
//

export default function DeafultComponent() {
  const { currentUser } = useRootLoaderData();
  const data: LoaderData = useDeserialize(useLoaderData());
  return <PageComponent currentUser={currentUser} {...data} />;
}

function findCurrentEntry(
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

function toggleArrayInclusion<T>(container: T[], element: T): T[] {
  if (container.includes(element)) {
    return container.filter((other) => other !== element);
  }
  return [...container, element];
}

// adhoc routines to derive `BookmarkState` by probing dom tree
function findSelectionEntryIndex(selection: Selection): number {
  const isValid =
    selection.toString().trim() &&
    selection.anchorNode &&
    selection.anchorNode === selection.focusNode &&
    selection.anchorNode.nodeType === document.TEXT_NODE &&
    selection.anchorNode.parentElement?.classList?.contains(
      BOOKMARKABLE_CLASSNAME
    );
  if (!isValid) return -1;
  const textElement = selection.getRangeAt(0).startContainer;
  const entryNode = textElement.parentElement?.parentElement?.parentElement;
  tinyassert(entryNode);
  const dataIndex = entryNode.getAttribute("data-index");
  const index = z.coerce.number().int().parse(dataIndex);
  return index;
}

const BOOKMARKABLE_CLASSNAME = "--bookmarkable--";

interface BookmarkState {
  captionEntry: CaptionEntryTable;
  text: string;
  side: number; // 0 | 1
  offset: number;
}

function PageComponent({
  video,
  captionEntries,
  currentUser,
}: LoaderData & { currentUser?: UserTable }) {
  const fetcher = useFetcher();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [focusedIndex] = React.useState(() =>
    zStringToMaybeInteger.parse(searchParams.get("index") ?? undefined)
  );

  //
  // state
  //

  const [player, setPlayer] = React.useState<YoutubePlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentEntry, setCurrentEntry] = React.useState<CaptionEntry>();
  const [repeatingEntries, setRepeatingEntries] = React.useState<
    CaptionEntry[]
  >([]);
  const [bookmarkState, setBookmarkState] = React.useState<BookmarkState>();

  //
  // handlers
  //

  useRafLoop(() => {
    if (!player) {
      return;
    }

    setIsPlaying(player.getPlayerState() === 1);
    setCurrentEntry(findCurrentEntry(captionEntries, player.getCurrentTime()));

    if (repeatingEntries.length > 0) {
      const begin = Math.min(...repeatingEntries.map((entry) => entry.begin));
      const end = Math.max(...repeatingEntries.map((entry) => entry.end));
      const currentTime = player.getCurrentTime();
      if (currentTime < begin || end < currentTime) {
        player.seekTo(begin);
      }
    }
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

  function onClickEntryRepeat(entry: CaptionEntry) {
    setRepeatingEntries(toggleArrayInclusion(repeatingEntries, entry));
  }

  function onClickBookmark() {
    if (!bookmarkState) return;
    const typedData: NewBookmark = {
      videoId: video.id,
      captionEntryId: bookmarkState.captionEntry.id,
      text: bookmarkState.text,
      side: bookmarkState.side,
      offset: bookmarkState.offset,
    };
    // use `unstable_shouldReload` to prevent invalidating loaders
    fetcher.submit(toForm(typedData), {
      method: "post",
      action: R["/bookmarks/new"],
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
    if (fetcher.type === "done") {
      if (fetcher.data.success) {
        enqueueSnackbar("Bookmark success", { variant: "success" });
      } else {
        enqueueSnackbar("Bookmark failed", { variant: "error" });
      }
      setBookmarkState(undefined);
    }
  }, [fetcher.type]);

  React.useEffect(() => {
    if (!isNil(focusedIndex)) {
      // smooth scroll ends up wrong positions due to over-estimation by `estimateSize`.
      virtualizer.scrollToIndex(focusedIndex, {
        align: "center",
        behavior: "auto",
      });
    }
  }, [focusedIndex]);

  useSelection((selection?: Selection): void => {
    let newBookmarkState: BookmarkState | undefined = undefined;
    if (selection) {
      const index = findSelectionEntryIndex(selection);
      if (index >= 0) {
        const el = selection.anchorNode!.parentNode!;
        const side = Array.from(el.parentNode!.children).findIndex(
          (c) => c === el
        );
        tinyassert(side === 0 || side === 1);
        newBookmarkState = {
          captionEntry: captionEntries[index],
          text: selection.toString(),
          side: side,
          offset: selection.anchorOffset,
        };
      }
    }
    setBookmarkState(newBookmarkState);
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
        <CaptionEntriesComponent
          virtualizer={virtualizer}
          entries={captionEntries}
          currentEntry={currentEntry}
          repeatingEntries={repeatingEntries}
          onClickEntryPlay={onClickEntryPlay}
          onClickEntryRepeat={onClickEntryRepeat}
          isPlaying={isPlaying}
          focusedIndex={focusedIndex}
        />
      }
      bookmarkActions={
        currentUser &&
        currentUser.id === video.userId && (
          <Transition
            show={!!bookmarkState || fetcher.state !== "idle"}
            className="absolute bottom-0 right-0 flex gap-2 p-1.5 transition-all duration-300"
            enterFrom="scale-[0.3] opacity-0"
            enterTo="scale-100 opacity-100"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-[0.3] opacity-0"
          >
            <button
              onClick={onCancelBookmark}
              className="w-12 h-12 rounded-full bg-secondary text-white flex justify-center items-center shadow-xl hover:contrast-75 transition-[filter] duration-300"
            >
              <X />
            </button>
            <button
              onClick={onClickBookmark}
              className="w-12 h-12 rounded-full bg-primary text-white flex justify-center items-center shadow-xl hover:contrast-75 transition-[filter] duration-300"
              data-test="new-bookmark-button"
            >
              {fetcher.state === "idle" ? (
                <Bookmark />
              ) : (
                <Spinner className="w-6 h-6" />
              )}
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

export function usePlayer({
  defaultOptions,
  onLoad = () => {},
  onError = () => {},
}: {
  defaultOptions: YoutubePlayerOptions; // only on mount effect
  onLoad?: (player: YoutubePlayer) => void;
  onError?: (e: Error) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const ref = React.useRef<HTMLDivElement>(null);
  const api = useYoutubeIframeApi(undefined, { onError });

  React.useEffect(() => {
    if (!api.isSuccess) return;
    if (!ref.current) {
      setLoading(false);
      throw new Error(`"ref" element is not available`);
    }
    if (!api.data) {
      setLoading(false);
      throw new Error();
    }

    let callback = () => {
      setLoading(false);
      onLoad(player);
    };
    const player = new api.data.Player(ref.current, {
      ...defaultOptions,
      events: { onReady: () => callback() },
    });
    // Avoid calling `onLoad` if unmounted before
    return () => {
      callback = () => {};
    };
  }, [api.isSuccess]);

  return [ref, loading] as const;
}

function PlayerComponent({
  defaultOptions,
  onLoad = () => {},
  onError = () => {},
}: {
  defaultOptions: YoutubePlayerOptions;
  onLoad?: (player: YoutubePlayer) => void;
  onError?: (e: Error) => void;
}) {
  const [ref, loading] = usePlayer({ defaultOptions, onLoad, onError });
  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-md md:max-w-none">
        <div className="relative pt-[56.2%]">
          <div className="absolute top-0 w-full h-full" ref={ref} />
        </div>
        {loading && (
          <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
            <Spinner className="w-20 h-20" />
          </div>
        )}
      </div>
    </div>
  );
}

function CaptionEntriesComponent({
  entries,
  focusedIndex,
  ...props
}: {
  entries: CaptionEntry[];
  currentEntry?: CaptionEntry;
  repeatingEntries: CaptionEntry[];
  onClickEntryPlay: (entry: CaptionEntry, toggle: boolean) => void;
  onClickEntryRepeat: (entry: CaptionEntry) => void;
  isPlaying: boolean;
  focusedIndex?: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}) {
  const virtualItems = props.virtualizer.getVirtualItems();
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
        {virtualItems.map((item) => (
          <CaptionEntryComponent
            key={item.key}
            entry={entries[item.index]}
            isFocused={focusedIndex === item.index}
            virtualItem={item}
            // workaround disappearing bottom margin (paddingEnd option doesn't seem to work)
            isActualLast={item.index === entries.length - 1}
            {...props}
          />
        ))}
      </div>
    </div>
  );
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
  highlight,
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
  highlight?: { side: number; offset: number; length: number };
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
      className={`
        w-full
        flex flex-col
        ${border && "border border-solid border-gray-200"}
        ${isEntryPlaying ? "border-blue-400" : "border-gray-200"}
        ${border && isCurrentEntry && "bg-gray-100"}
        ${isFocused && "border-l-2 border-l-blue-500"}
        ${virtualItem?.index === 0 && "mt-1.5"}
        ${isActualLast && "mb-1.5"}
        p-1.5 gap-1
        text-xs
      `}
      ref={virtualizer?.measureElement}
      data-index={virtualItem?.index}
    >
      <div className="flex items-center justify-end text-gray-500">
        <div>{timestamp}</div>
        {!isNil(videoId) && (
          <Link
            to={R["/videos/$id"](videoId) + `?index=${entry.index}`}
            className={`ml-2 btn btn-xs btn-circle btn-ghost`}
            data-test="caption-entry-component__video-link"
          >
            <Video size={14} />
          </Link>
        )}
        <div
          className={`ml-2 btn btn-xs btn-circle btn-ghost ${
            isRepeating && "text-blue-700"
          }`}
          onClick={() => onClickEntryRepeat(entry)}
        >
          <Repeat size={14} />
        </div>
        <div
          className={`ml-2 btn btn-xs btn-circle btn-ghost ${
            isEntryPlaying && "text-blue-700"
          }`}
          onClick={() => onClickEntryPlay(entry, false)}
        >
          <Play size={14} />
        </div>
      </div>
      <div
        className="flex text-gray-700 cursor-pointer"
        onClick={() => onClickEntryPlay(entry, true)}
      >
        <div
          className={`flex-auto w-1/2 pr-2 border-r border-solid border-gray-200 ${BOOKMARKABLE_CLASSNAME}`}
        >
          {highlight?.side === 0 ? (
            <HighlightText
              text={text1}
              offset={highlight.offset}
              length={highlight.length}
            />
          ) : (
            text1
          )}
        </div>
        <div className={`flex-auto w-1/2 pl-2 ${BOOKMARKABLE_CLASSNAME}`}>
          {highlight?.side === 1 ? (
            <HighlightText
              text={text2}
              offset={highlight.offset}
              length={highlight.length}
            />
          ) : (
            text2
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightText({
  text,
  offset,
  length,
}: {
  text: string;
  offset: number;
  length: number;
}) {
  const t1 = text.slice(0, offset);
  const t2 = text.slice(offset, offset + length);
  const t3 = text.slice(offset + length);
  return (
    <>
      {t1}
      <span className="underline">{t2}</span>
      {t3}
    </>
  );
}

// @ts-ignore
function toCaptionEntryId({ begin, end }: CaptionEntry): string {
  return `${begin}--${end}`;
}

function NavBarMenuComponent() {
  const { currentUser } = useRootLoaderData();
  const { video }: LoaderData = useDeserialize(useLeafLoaderData());
  return <NavBarMenuComponentImpl user={currentUser} video={video} />;
}

function NavBarMenuComponentImpl({
  user,
  video,
}: {
  user?: UserTable;
  video: VideoTable;
}) {
  // TODO: refactor too much copy-paste of `Popover` from `NavBar` in `root.tsx`
  return (
    <>
      {user && user.id !== video.userId && (
        <Form method="post" action={R["/videos/new"]} className="flex-none">
          {/* prettier-ignore */}
          <>
            <input readOnly hidden name="videoId" value={video.videoId} />
            <input readOnly hidden name="language1.id" value={video.language1_id} />
            <input readOnly hidden name="language1.translation" value={video.language1_translation ?? ""} />
            <input readOnly hidden name="language2.id" value={video.language2_id} />
            <input readOnly hidden name="language2.translation" value={video.language2_translation ?? ""} />
          </>
          <button type="submit" className="btn btn-sm btn-ghost">
            <Save />
          </button>
        </Form>
      )}
      <div className="flex-none">
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className="btn btn-sm btn-ghost"
              data-test="user-menu"
              {...props}
            >
              <MoreVertical />
            </button>
          )}
          floating={({ open, setOpen, props }) => (
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
              <ul className="menu rounded p-3 shadow w-48 bg-base-100 text-base-content text-sm">
                <li>
                  <Link
                    to={R["/videos/new"] + "?videoId=" + video.videoId}
                    onClick={() => setOpen(false)}
                  >
                    Change languages
                  </Link>
                </li>
              </ul>
            </Transition>
          )}
        />
      </div>
    </>
  );
}

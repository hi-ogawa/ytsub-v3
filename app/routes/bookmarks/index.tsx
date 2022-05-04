import { Transition } from "@headlessui/react";
import { Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { omit } from "lodash";
import * as React from "react";
import { Book, ChevronDown, ChevronUp, Filter, Video, X } from "react-feather";
import { z } from "zod";
import { PaginationComponent } from "../../components/misc";
import { useModal } from "../../components/modal";
import { Popover } from "../../components/popover";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  PaginationResult,
  Q,
  VideoTable,
  toPaginationResult,
} from "../../db/models";
import { R } from "../../misc/routes";
import { useToById } from "../../utils/by-id";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize, useRafLoop } from "../../utils/hooks";
import { useLeafLoaderData } from "../../utils/loader-utils";
import { isNonNullable } from "../../utils/misc";
import { PageHandle } from "../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../utils/pagination";
import { CaptionEntry } from "../../utils/types";
import { toQuery } from "../../utils/url-data";
import { YoutubePlayer } from "../../utils/youtube";
import { zStringToInteger } from "../../utils/zod-utils";
import { CaptionEntryComponent, usePlayer } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: () => "Bookmarks",
  navBarMenu: () => <NavBarMenuComponent />,
};

const BOOKMARKS_REQUEST = z
  .object({
    videoId: zStringToInteger.optional(),
    deckId: zStringToInteger.optional(),
    order: z.enum(["createdAt", "caption"]).default("createdAt"),
  })
  .merge(PAGINATION_PARAMS_SCHEMA);

type BookmarksRequest = z.infer<typeof BOOKMARKS_REQUEST>;

interface LoaderData {
  pagination: PaginationResult<BookmarkEntryTable>;
  videos: VideoTable[];
  captionEntries: CaptionEntryTable[];
  request: BookmarksRequest;
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    this.flash({
      content: "Signin required.",
      variant: "error",
    });
    return redirect(R["/users/signin"]);
  }

  const parsed = BOOKMARKS_REQUEST.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/bookmarks"]);
  }

  const request = parsed.data;
  const userId = user.id;
  let sql = Q.bookmarkEntries()
    .select("bookmarkEntries.*")
    .where("bookmarkEntries.userId", userId);

  if (request.videoId) {
    sql = sql.where("bookmarkEntries.videoId", request.videoId);
  }

  // TODO: test
  if (request.deckId) {
    sql = sql
      .join(
        "practiceEntries",
        "practiceEntries.bookmarkEntryId",
        "bookmarkEntries.id"
      )
      .join("decks", "decks.id", "practiceEntries.deckId")
      .where("decks.id", request.deckId);
  }

  if (request.order === "createdAt") {
    sql = sql.orderBy("bookmarkEntries.createdAt", "desc");
  }

  if (request.order === "caption") {
    sql = sql.join(
      "captionEntries",
      "captionEntries.id",
      "bookmarkEntries.captionEntryId"
    );
    sql = sql.orderBy([
      {
        column: "captionEntries.index",
        order: "asc",
      },
      {
        column: "bookmarkEntries.offset",
        order: "asc",
      },
    ]);
  }

  const pagination = await toPaginationResult(sql, parsed.data);
  const bookmarkEntries = pagination.data;
  const videos = await Q.videos().whereIn(
    "id",
    bookmarkEntries.map((x) => x.videoId)
  );
  const captionEntries = await Q.captionEntries().whereIn(
    "id",
    bookmarkEntries.map((x) => x.captionEntryId)
  );
  const res: LoaderData = {
    videos,
    captionEntries,
    pagination,
    request,
  };
  return this.serialize(res);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <ComponentImpl {...data} />;
}

function ComponentImpl(props: LoaderData) {
  const videos = useToById(props.videos);
  const captionEntries = useToById(props.captionEntries);
  const bookmarkEntries = props.pagination.data;

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            {/* TODO: CTA when empty */}
            {bookmarkEntries.length === 0 && <div>Empty</div>}
            {bookmarkEntries.map((bookmarkEntry) => (
              <BookmarkEntryComponent
                key={bookmarkEntry.id}
                video={videos.byId[bookmarkEntry.videoId]}
                captionEntry={captionEntries.byId[bookmarkEntry.captionEntryId]}
                bookmarkEntry={bookmarkEntry}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="w-full h-8" /> {/* fake padding to allow scrool more */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent
          pagination={props.pagination}
          query={toQuery(omit(props.request, ["page", "perPage"]))}
        />
      </div>
    </>
  );
}

export function BookmarkEntryComponent({
  video,
  captionEntry,
  bookmarkEntry,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
}) {
  let [open, setOpen] = React.useState(false);

  return (
    <div
      className="border border-gray-200 flex flex-col"
      data-test="bookmark-entry"
    >
      <div className="flex items-center p-2 gap-2">
        <button
          className="flex-none btn btn-xs btn-circle btn-ghost text-gray-500"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div
          className="grow text-sm cursor-pointer"
          onClick={() => setOpen(!open)}
          data-test="bookmark-entry-text"
        >
          {bookmarkEntry.text}
        </div>
        {/* TODO: ability to delete */}
        {false && (
          <button
            className="flex-none btn btn-xs btn-circle btn-ghost text-gray-500"
            onClick={() => {}}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && <MiniPlayer video={video} captionEntry={captionEntry} />}
    </div>
  );
}

function MiniPlayer({
  video,
  captionEntry,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
}) {
  const [player, setPlayer] = React.useState<YoutubePlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isRepeating, setIsRepeating] = React.useState(false);
  const { begin, end } = captionEntry;

  //
  // handlers
  //

  function onClickEntryPlay(entry: CaptionEntry, toggle: boolean) {
    if (!player) return;

    // No-op if some text is selected (e.g. for google translate extension)
    if (document.getSelection()?.toString()) return;

    if (toggle) {
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

  function onClickEntryRepeat() {
    setIsRepeating(!isRepeating);
  }

  //
  // effects
  //

  const [playerRef, playerLoading] = usePlayer({
    defaultOptions: {
      videoId: video.videoId,
      playerVars: { start: Math.max(0, Math.floor(begin) - 1) },
    },
    onLoad: setPlayer,
  });

  useRafLoop(
    React.useCallback(() => {
      if (!player) return;

      // update `isPlaying`
      setIsPlaying(player.getPlayerState() === 1);

      // handle `isRepeating`
      if (isRepeating) {
        const currentTime = player.getCurrentTime();
        if (currentTime < begin || end < currentTime) {
          player.seekTo(begin);
        }
      }
    }, [player, isRepeating])
  );

  return (
    <div className="w-full flex flex-col items-center p-2 pt-0">
      <div className="relative w-full">
        <div className="relative pt-[56.2%]">
          <div className="absolute top-0 w-full h-full" ref={playerRef} />
        </div>
        {playerLoading && (
          <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
            <div
              className="w-20 h-20 rounded-full animate-spin"
              style={{
                border: "3px solid #999",
                borderLeft: "3px solid #ddd",
                borderTop: "3px solid #ddd",
              }}
            />
          </div>
        )}
      </div>
      {/* TODO: highlight bookmark text? */}
      <CaptionEntryComponent
        entry={captionEntry}
        currentEntry={captionEntry}
        repeatingEntries={isRepeating ? [captionEntry] : []}
        onClickEntryPlay={onClickEntryPlay}
        onClickEntryRepeat={onClickEntryRepeat}
        isPlaying={isPlaying}
        videoId={video.id}
        border={false}
      />
    </div>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  const { request }: LoaderData = useDeserialize(useLeafLoaderData());
  const { openModal } = useModal();

  function onClickVideoFilter() {
    openModal(<VideoSelectComponent />);
  }

  function onClickDeckFilter() {
    openModal(<DeckSelectComponent />);
  }

  const isFilterActive = isNonNullable(request.videoId ?? request.deckId);

  return (
    <>
      <div className="flex-none">
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className={`btn btn-sm btn-ghost ${
                isFilterActive && "btn-active"
              }`}
              {...props}
            >
              <Filter />
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
                  <button onClick={onClickVideoFilter}>
                    <Video />
                    Select Video
                  </button>
                </li>
                <li>
                  <button onClick={onClickDeckFilter}>
                    <Book />
                    Select Deck
                  </button>
                </li>
                <li>
                  <Link to={R["/bookmarks"]} onClick={() => setOpen(false)}>
                    <X />
                    Clear
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

function VideoSelectComponent() {
  return (
    <div className="border shadow-xl rounded-xl bg-base-100 p-4 flex flex-col gap-2">
      <div className="text-lg">TODO</div>
    </div>
  );
}

function DeckSelectComponent() {
  return (
    <div className="border shadow-xl rounded-xl bg-base-100 p-4 flex flex-col gap-2">
      <div className="text-lg">TODO</div>
    </div>
  );
}

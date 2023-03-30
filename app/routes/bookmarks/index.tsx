import { Transition } from "@headlessui/react";
import { isNil } from "@hiogawa/utils";
import { useRafLoop } from "@hiogawa/utils-react";
import { Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { omit } from "lodash";
import React from "react";
import { z } from "zod";
import { CollapseTransition } from "../../components/collapse";
import { PaginationComponent, transitionProps } from "../../components/misc";
import { useModal } from "../../components/modal";
import { PopoverSimple } from "../../components/popover";
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
import { useDeserialize } from "../../utils/hooks";
import { useLeafLoaderData } from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../utils/pagination";
import type { CaptionEntry } from "../../utils/types";
import { toQuery } from "../../utils/url-data";
import { YoutubePlayer, usePlayerLoader } from "../../utils/youtube";
import { CaptionEntryComponent } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: () => "Bookmarks",
  navBarMenu: () => <NavBarMenuComponent />,
};

const BOOKMARKS_REQUEST = z
  .object({
    videoId: z.coerce.number().int().optional(),
    deckId: z.coerce.number().int().optional(),
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
  showAutoplay,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  showAutoplay?: boolean;
}) {
  let [open, setOpen] = React.useState(false);
  let [autoplay, setAutoplay] = React.useState(false);

  function onClickAutoPlay() {
    setAutoplay(true);
    setOpen(!open);
  }

  // close when practice entry changed (/decks/$id/practice.tsx)
  React.useEffect(() => {
    setOpen(false);
  }, [bookmarkEntry]);

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
            className="antd-btn antd-btn-ghost i-ri-play-line w-5 h-5"
            onClick={onClickAutoPlay}
          />
        )}
        {/* TODO: ability to delete */}
        <button
          className="antd-btn antd-btn-ghost i-ri-close-line w-5 h-5 hidden"
          onClick={() => {}}
        />
      </div>
      <CollapseTransition
        show={open}
        className="duration-300 h-0 overflow-hidden"
      >
        <MiniPlayer
          video={video}
          captionEntry={captionEntry}
          autoplay={autoplay}
          defaultIsRepeating={autoplay}
          highlight={{
            side: bookmarkEntry.side,
            offset: bookmarkEntry.offset,
            length: bookmarkEntry.text.length,
          }}
        />
      </CollapseTransition>
    </div>
  );
}

export function MiniPlayer({
  video,
  captionEntry,
  autoplay,
  defaultIsRepeating,
  highlight,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  autoplay: boolean;
  defaultIsRepeating: boolean;
  highlight: { side: number; offset: number; length: number };
}) {
  const [player, setPlayer] = React.useState<YoutubePlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isRepeating, setIsRepeating] = React.useState(defaultIsRepeating);
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

  const playerLoader = usePlayerLoader(
    {
      videoId: video.videoId,
      playerVars: {
        start: Math.max(0, Math.floor(begin) - 1),
        autoplay: autoplay ? 1 : 0,
      },
    },
    {
      onSuccess: setPlayer,
    }
  );

  useRafLoop(() => {
    if (!player) return;

    setIsPlaying(player.getPlayerState() === 1);

    if (isRepeating) {
      const currentTime = player.getCurrentTime();
      if (currentTime < begin || end < currentTime) {
        player.seekTo(begin);
      }
    }
  });

  return (
    <div className="w-full flex flex-col items-center p-2 pt-0 gap-2">
      <CaptionEntryComponent
        entry={captionEntry}
        currentEntry={captionEntry}
        repeatingEntries={isRepeating ? [captionEntry] : []}
        onClickEntryPlay={onClickEntryPlay}
        onClickEntryRepeat={onClickEntryRepeat}
        isPlaying={isPlaying}
        videoId={video.id}
        border={false}
        highlight={highlight}
        showTypingPractice
      />
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
  const { request }: LoaderData = useDeserialize(useLeafLoaderData());
  const videoSelectModal = useModal();
  const deckSelectModal = useModal();

  const isFilterActive = !isNil(request.videoId ?? request.deckId);

  return (
    <>
      <div className="flex items-center">
        <PopoverSimple
          placement="bottom-end"
          reference={
            <button
              className={cls(
                "antd-btn antd-btn-ghost i-ri-filter-line w-6 h-6",
                isFilterActive && "text-colorPrimary"
              )}
            />
          }
          floating={(context) => (
            <ul className="flex flex-col gap-2 p-2 w-[160px] text-sm">
              <li>
                <button
                  className="w-full antd-menu-item flex items-center gap-2 p-2"
                  onClick={() => videoSelectModal.setOpen(true)}
                >
                  <span className="i-ri-vidicon-line w-5 h-5"></span>
                  Select Video
                </button>
              </li>
              <li>
                <button
                  className="w-full antd-menu-item flex items-center gap-2 p-2"
                  onClick={() => deckSelectModal.setOpen(true)}
                >
                  <span className="i-ri-book-line w-5 h-5"></span>
                  Select Deck
                </button>
              </li>
              <li>
                <Link
                  className="w-full antd-menu-item flex items-center gap-2 p-2"
                  to={R["/bookmarks"]}
                  onClick={() => context.onOpenChange(false)}
                >
                  <span className="i-ri-close-line w-5 h-5"></span>
                  Clear
                </Link>
              </li>
            </ul>
          )}
        />
      </div>
      <videoSelectModal.Wrapper>
        <VideoSelectComponent />
      </videoSelectModal.Wrapper>
      <deckSelectModal.Wrapper>
        <DeckSelectComponent />
      </deckSelectModal.Wrapper>
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

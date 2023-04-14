import { Transition } from "@headlessui/react";
import { isNil } from "@hiogawa/utils";
import { useRafLoop } from "@hiogawa/utils-react";
import { Link, NavLink, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { omit } from "lodash";
import React from "react";
import type { z } from "zod";
import { CollapseTransition } from "../../components/collapse";
import { PaginationComponent, transitionProps } from "../../components/misc";
import { useModal } from "../../components/modal";
import { PopoverSimple } from "../../components/popover";
import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  PaginationMetadata,
  VideoTable,
} from "../../db/models";
import { R, ROUTE_DEF } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { useLeafLoaderData } from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionEntry } from "../../utils/types";
import { toQuery } from "../../utils/url-data";
import { YoutubePlayer, usePlayerLoader } from "../../utils/youtube";
import { CaptionEntryComponent } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: () => "Bookmarks",
  navBarMenu: () => <NavBarMenuComponent />,
};

interface LoaderData {
  rows: Pick<TT, "bookmarkEntries" | "videos" | "captionEntries">[];
  pagination: PaginationMetadata;
  request: z.infer<(typeof ROUTE_DEF)["/bookmarks"]["query"]>;
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

  const parsed = ROUTE_DEF["/bookmarks"].query.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/bookmarks"]);
  }

  const request = parsed.data;

  let query = db
    .select()
    .from(T.bookmarkEntries)
    .innerJoin(T.videos, E.eq(T.videos.id, T.bookmarkEntries.videoId))
    .innerJoin(
      T.captionEntries,
      E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
    );

  if (request.deckId) {
    query = query
      .innerJoin(
        T.practiceEntries,
        E.eq(T.practiceEntries.bookmarkEntryId, T.bookmarkEntries.id)
      )
      .innerJoin(T.decks, E.eq(T.decks.id, T.practiceEntries.deckId));
  }

  const [rows, pagination] = await toPaginationResult(
    query
      .where(
        E.and(
          E.eq(T.bookmarkEntries.userId, user.id),
          request.videoId
            ? E.eq(T.bookmarkEntries.videoId, request.videoId)
            : undefined,
          request.deckId ? E.eq(T.decks.id, request.deckId) : undefined
        )
      )
      .orderBy(
        request.order === "caption"
          ? E.asc(T.captionEntries.index)
          : E.desc(T.bookmarkEntries.createdAt)
      ),
    request
  );
  const loaderData: LoaderData = {
    rows,
    pagination,
    request,
  };
  return this.serialize(loaderData);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <ComponentImpl {...data} />;
}

function ComponentImpl(props: LoaderData) {
  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            {/* TODO: CTA when empty */}
            {props.rows.length === 0 && <div>Empty</div>}
            {props.rows.map((row) => (
              <BookmarkEntryComponent
                key={row.bookmarkEntries.id}
                video={row.videos}
                captionEntry={row.captionEntries}
                bookmarkEntry={row.bookmarkEntries}
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

export function BookmarksMenuItems({
  onClickItem,
}: {
  onClickItem: () => void;
}) {
  const items = [
    {
      to: R["/bookmarks"],
      children: (
        <>
          <span className="i-ri-bookmark-line w-6 h-6"></span>
          Bookmarks
        </>
      ),
    },
    {
      to: R["/bookmarks/history-chart"],
      children: (
        <>
          <span className="i-ri-bar-chart-2-line w-6 h-6"></span>
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

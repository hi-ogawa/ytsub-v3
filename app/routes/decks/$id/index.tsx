import { Transition } from "@headlessui/react";
import { Link, NavLink } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { PaginationComponent, transitionProps } from "../../../components/misc";
import { PopoverSimple } from "../../../components/popover";
import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PaginationMetadata,
  PracticeEntryTable,
  VideoTable,
} from "../../../db/models";
import type { PracticeActionType, PracticeQueueType } from "../../../db/types";
import { $R, ROUTE_DEF } from "../../../misc/routes";
import { trpc } from "../../../trpc/client";
import { intl, intlWrapper } from "../../../utils/intl";
import { requireUserAndDeckV2 } from "../../../utils/loader-deck-utils";
import {
  makeLoader,
  useLeafLoaderData,
  useLoaderDataExtra,
} from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { MiniPlayer } from "../../bookmarks";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

//
// loader
//

type PracticeEntryTableExtra = PracticeEntryTable & {
  practiceActionsCount: number;
};

interface LoaderData {
  deck: DeckTable;
  pagination: PaginationMetadata;
  rows: Pick<
    TT,
    "practiceEntries" | "bookmarkEntries" | "captionEntries" | "videos"
  >[];
}

export const loader = /* @__PURE__ */ makeLoader(async ({ ctx }) => {
  const { deck } = await requireUserAndDeckV2(ctx);
  const reqQuery = ROUTE_DEF["/decks/$id"].query.parse(ctx.query);

  const baseQuery = db
    .select()
    .from(T.practiceEntries)
    .innerJoin(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
    )
    .innerJoin(
      T.captionEntries,
      E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
    )
    .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
    .where(E.eq(T.practiceEntries.deckId, deck.id))
    .orderBy(E.asc(T.practiceEntries.createdAt));

  const [rows, pagination] = await toPaginationResult(baseQuery, reqQuery);

  const loaderData: LoaderData = {
    deck,
    pagination,
    rows,
  };
  return loaderData;
});

//
// component
//

export default function DefaultComponent() {
  const { deck, pagination, rows } = useLoaderDataExtra() as LoaderData;

  const content = (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <QueueStatisticsComponent deckId={deck.id} />
          {rows.length === 0 && <div>Empty</div>}
          {rows.map((row) => (
            <PracticeBookmarkEntryComponent
              key={row.practiceEntries.id}
              practiceEntry={row.practiceEntries}
              bookmarkEntry={row.bookmarkEntries}
              captionEntry={row.captionEntries}
              video={row.videos}
              deck={deck}
            />
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <>
      {content}
      <div className="w-full h-8" /> {/* padding for scroll */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent pagination={pagination} />
      </div>
    </>
  );
}

export function QueueStatisticsComponent({
  deckId,
  currentQueueType,
}: {
  deckId: number;
  currentQueueType?: PracticeQueueType;
}) {
  const practiceStatisticsQuery = useQuery(
    trpc.decks_practiceStatistics.queryOptions({ deckId })
  );

  return (
    <div className="w-full flex items-center p-2 px-4">
      {/* TODO: help to explain what these numbers mean */}
      <div className="text-sm uppercase">Progress</div>
      <div className="flex-1 flex px-4 relative">
        <div className="flex-1" />
        {renderItem("NEW")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("LEARN")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("REVIEW")}
        <div className="flex-1" />
        <Transition
          show={practiceStatisticsQuery.isFetching}
          className="duration-500 antd-body antd-spin-overlay-6"
          {...transitionProps("opacity-0", "opacity-50")}
        />
      </div>
    </div>
  );

  function renderItem(type: PracticeQueueType) {
    const data = practiceStatisticsQuery.data;
    return (
      <div
        className={cls(
          "border-b border-transparent",
          PRACTICE_QUEUE_TYPE_TO_COLOR[type],
          type === currentQueueType && "!border-current"
        )}
      >
        {data?.daily.byQueueType[type]} | {data?.total.byQueueType[type]}
      </div>
    );
  }
}

const PRACTICE_QUEUE_TYPE_TO_COLOR = {
  NEW: "text-colorWarningText",
  LEARN: "text-colorSuccessText",
  REVIEW: "text-colorInfoText",
} satisfies Record<PracticeQueueType, string>;

const PRACTICE_QUEUE_TYPE_TO_ICON = {
  NEW: "i-ri-checkbox-blank-circle-line",
  LEARN: "i-ri-focus-line",
  REVIEW: "i-ri-checkbox-circle-line",
} satisfies Record<PracticeQueueType, string>;

export const PRACTICE_ACTION_TYPE_TO_COLOR = {
  AGAIN: "text-colorErrorText",
  HARD: "text-colorWarningText",
  GOOD: "text-colorSuccessText",
  EASY: "text-colorInfoText",
} satisfies Record<PracticeActionType, string>;

function PracticeBookmarkEntryComponent({
  video,
  captionEntry,
  bookmarkEntry,
  practiceEntry,
  deck,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  practiceEntry: PracticeEntryTableExtra;
  deck: DeckTable;
  showAutoplay?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const actionsCount = practiceEntry.practiceActionsCount;
  const practiceEntryId = practiceEntry.id;

  return (
    <div className="border flex flex-col" data-test="bookmark-entry">
      <div
        className={cls(
          "flex flex-col p-2 gap-2 w-full items-stretch",
          open && "border-b border-dashed"
        )}
      >
        <div
          className="flex gap-2 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <div className="h-[20px] flex items-center">
            <QueueTypeIcon queueType={practiceEntry.queueType} />
          </div>
          <div
            className="flex-1 text-sm cursor-pointer"
            data-test="bookmark-entry-text"
          >
            {bookmarkEntry.text}
          </div>
        </div>
        <div className="relative flex items-center gap-2 ml-6 text-xs text-colorTextSecondary">
          <Link
            to={$R["/decks/$id/history"](deck, { practiceEntryId })}
            className="hover:underline"
          >
            {intlWrapper(
              "Answered {actionsCount, plural, =0 {none} =1 {once} other {# times}}",
              { actionsCount }
            )}
          </Link>
          {"⋅"}
          <div suppressHydrationWarning>
            Scheduled at{" "}
            {intl.formatDate(practiceEntry.scheduledAt, {
              dateStyle: "medium",
              timeStyle: "medium",
              hour12: false,
            })}
          </div>
          <div className="absolute right-0 bottom-0 flex">
            <button
              className={cls(
                "antd-btn antd-btn-ghost i-ri-arrow-down-s-line w-5 h-5",
                open && "rotate-180"
              )}
              onClick={() => setOpen(!open)}
            ></button>
          </div>
        </div>
      </div>
      {open && (
        <MiniPlayer
          video={video}
          captionEntry={captionEntry}
          autoplay={false}
          defaultIsRepeating={false}
          highlight={{
            side: bookmarkEntry.side,
            offset: bookmarkEntry.offset,
            length: bookmarkEntry.text.length,
          }}
        />
      )}
    </div>
  );
}

export function QueueTypeIcon({ queueType }: { queueType: PracticeQueueType }) {
  return (
    <span
      // prettier-ignore
      className={cls(
        "w-5 h-5",
        PRACTICE_QUEUE_TYPE_TO_COLOR[queueType],
        PRACTICE_QUEUE_TYPE_TO_ICON[queueType]
      )}
    />
  );
}

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck } = useLeafLoaderData() as LoaderData;
  return <>{deck.name}</>;
}

//
// NavBarMenuComponent
//

export function DeckNavBarMenuComponent() {
  const { deck } = useLeafLoaderData() as LoaderData;
  return <DeckMenuComponent deck={deck} />;
}

export function DeckMenuComponent({ deck }: { deck: DeckTable }) {
  const items = [
    {
      to: $R["/decks/$id/practice"](deck),
      children: (
        <>
          <span className="i-ri-play-line w-6 h-6"></span>
          Practice
        </>
      ),
    },
    {
      to: $R["/decks/$id/history"](deck),
      children: (
        <>
          <span className="i-ri-history-line w-6 h-6"></span>
          History
        </>
      ),
    },
    {
      to: $R["/decks/$id/history-graph"](deck),
      children: (
        <>
          <span className="i-ri-bar-chart-line w-6 h-6"></span>
          Chart
        </>
      ),
    },
    {
      to: $R["/decks/$id"](deck),
      children: (
        <>
          <span className="i-ri-book-line w-6 h-6"></span>
          Deck
        </>
      ),
    },
    {
      to: $R["/bookmarks"](null, { deckId: deck.id }),
      children: (
        <>
          <span className="i-ri-bookmark-line w-6 h-6"></span>
          Bookmarks{" "}
        </>
      ),
    },
    {
      to: $R["/decks/$id/edit"](deck),
      children: (
        <>
          <span className="i-ri-edit-line w-6 h-6"></span>
          Edit
        </>
      ),
    },
  ];

  return (
    <PopoverSimple
      placement="bottom-end"
      reference={
        <button
          className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
          data-test="deck-menu-popover-reference"
        />
      }
      floating={(context) => (
        <ul
          className="flex flex-col gap-2 p-2 w-[180px] text-sm"
          data-test="deck-menu-popover-floating"
        >
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
                onClick={() => context.onOpenChange(false)}
                {...item}
              />
            </li>
          ))}
        </ul>
      )}
    />
  );
}

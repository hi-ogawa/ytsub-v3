import { Link, NavLink, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import { z } from "zod";
import { PaginationComponent } from "../../../components/misc";
import { PopoverSimple } from "../../../components/popover";
import {
  E,
  T,
  TT,
  db,
  findOne,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PaginationMetadata,
  PracticeEntryTable,
  UserTable,
  VideoTable,
} from "../../../db/models";
import type { PracticeQueueType } from "../../../db/types";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { dtfDateOnly, rtf } from "../../../utils/intl";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../../utils/pagination";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { Timedelta } from "../../../utils/timedelta";
import { toQuery } from "../../../utils/url-data";
import { MiniPlayer } from "../../bookmarks";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

const PARAMS_SCHEMA = z.object({
  id: z.coerce.number().int(),
});

export async function requireUserAndDeck(
  this: Controller
): Promise<[UserTable, DeckTable]> {
  const userId = this.currentUserId();
  if (userId) {
    const parsed = PARAMS_SCHEMA.safeParse(this.args.params);
    if (parsed.success) {
      const { id } = parsed.data;
      const found = await findOne(
        db
          .select()
          .from(T.users)
          .innerJoin(T.decks, E.eq(T.decks.userId, T.users.id))
          .where(E.and(E.eq(T.users.id, userId), E.eq(T.decks.id, id)))
      );
      if (found) {
        return [found.users, found.decks];
      }
    }
  }
  this.flash({ content: "Deck not found", variant: "error" });
  throw redirect(R["/decks"]);
}

//
// loader
//

type PracticeEntryTableExtra = PracticeEntryTable & {
  practiceActionsCount: number;
};

interface LoaderData {
  deck: DeckTable;
  statistics: DeckPracticeStatistics;
  pagination: PaginationMetadata;
  rows: Pick<
    TT,
    "practiceEntries" | "bookmarkEntries" | "captionEntries" | "videos"
  >[];
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const system = new PracticeSystem(user, deck);
  const now = new Date();
  const statistics = await system.getStatistics(now);

  const paginationParams = PAGINATION_PARAMS_SCHEMA.safeParse(this.query());
  if (!paginationParams.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/decks/$id"](deck.id));
  }

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

  const [rows, pagination] = await toPaginationResult(
    baseQuery,
    paginationParams.data
  );

  const res: LoaderData = {
    deck,
    statistics,
    pagination,
    rows,
  };
  return this.serialize(res);
});

//
// component
//

export default function DefaultComponent() {
  const { deck, statistics, pagination, rows }: LoaderData = useDeserialize(
    useLoaderData()
  );

  const content = (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <DeckPracticeStatisticsComponent statistics={statistics} />
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
      <div className="w-full h-8" /> {/* fake padding to allow scrool more */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent pagination={pagination} />
      </div>
    </>
  );
}

export function DeckPracticeStatisticsComponent({
  statistics,
  currentQueueType,
}: {
  statistics: DeckPracticeStatistics;
  currentQueueType?: PracticeQueueType;
}) {
  return (
    <div className="w-full flex items-center p-2 px-4">
      <div className="text-sm uppercase">Progress</div>
      {/* prettier-ignore */}
      <div className="grow flex px-4">
        <div className="flex-1" />
        <div className={cls("text-colorInfoText border-b border-transparent", currentQueueType === "NEW" && "!border-current")}>
          {statistics.NEW.daily} | {statistics.NEW.total}
        </div>
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        <div className={cls("text-colorWarningText border-b border-transparent", currentQueueType === "LEARN" && "!border-current")}>
          {statistics.LEARN.daily} | {statistics.LEARN.total}
        </div>
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        <div className={cls("text-colorSuccessText border-b border-transparent", currentQueueType === "REVIEW" && "!border-current")}>
          {statistics.REVIEW.daily} | {statistics.REVIEW.total}
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}

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
            to={
              R["/decks/$id/history"](deck.id) +
              "?" +
              toQuery({ practiceEntryId })
            }
            className="hover:underline"
          >
            Answered {formatCount(actionsCount)}
          </Link>
          {"⋅"}
          <div suppressHydrationWarning>
            Scheduled {formatScheduledAt(practiceEntry.scheduledAt, new Date())}
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
        queueType === "NEW" && "i-ri-checkbox-blank-circle-line text-colorInfoText",
        queueType === "LEARN" && "i-ri-record-circle-line text-colorWarningText",
        queueType === "REVIEW" && "i-ri-checkbox-circle-line text-colorSuccessText"
      )}
    />
  );
}

function formatCount(n: number): string {
  if (n === 1) return "once";
  return `${n} times`;
}

function formatScheduledAt(date: Date, now: Date): string | undefined {
  const delta = Timedelta.difference(date, now);
  if (delta.value <= 0) {
    return "at " + dtfDateOnly.format(date);
  }
  const n = delta.normalize();
  for (const unit of ["days", "hours", "minutes"] as const) {
    if (n[unit] > 0) {
      return rtf.format(n[unit], unit);
    }
  }
  return rtf.format(n.seconds, "seconds");
}

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());
  return <>{deck.name}</>;
}

//
// NavBarMenuComponent
//

export function DeckNavBarMenuComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  const items = [
    {
      to: R["/decks/$id"](deck.id),
      children: (
        <>
          <span className="i-ri-book-line w-6 h-6"></span>
          Deck
        </>
      ),
    },
    {
      to: R["/decks/$id/practice"](deck.id),
      children: (
        <>
          <span className="i-ri-play-line w-6 h-6"></span>
          Practice
        </>
      ),
    },
    {
      to: R["/decks/$id/history-graph"](deck.id),
      children: (
        <>
          <span className="i-ri-history-line w-6 h-6"></span>
          History
        </>
      ),
    },
    {
      to: R["/bookmarks"] + `?deckId=${deck.id}`,
      children: (
        <>
          <span className="i-ri-bookmark-line w-6 h-6"></span>
          Bookmarks{" "}
        </>
      ),
    },
    {
      to: R["/decks/$id/edit"](deck.id),
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

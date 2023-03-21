import { tinyassert } from "@hiogawa/utils";
import { Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import { NavLink } from "react-router-dom";
import { z } from "zod";
import { PaginationComponent } from "../../../components/misc";
import { PopoverSimple } from "../../../components/popover";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PaginationMetadata,
  PracticeEntryTable,
  PracticeQueueType,
  Q,
  UserTable,
  VideoTable,
  normalizeRelation,
  normalizeRelationWithPagination,
} from "../../../db/models";
import { R } from "../../../misc/routes";
import { useToById } from "../../../utils/by-id";
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
import { zStringToInteger } from "../../../utils/zod-utils";
import { MiniPlayer } from "../../bookmarks";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

const PARAMS_SCHEMA = z.object({
  id: zStringToInteger,
});

export async function requireUserAndDeck(
  this: Controller
): Promise<[UserTable, DeckTable]> {
  const userId = this.currentUserId();
  if (userId) {
    const parsed = PARAMS_SCHEMA.safeParse(this.args.params);
    if (parsed.success) {
      const { id } = parsed.data;
      const { users, decks } = await normalizeRelation(
        Q.users().leftJoin("decks", "decks.userId", "users.id").where({
          "users.id": userId,
          "decks.id": id,
        }),
        ["decks", "users"]
      );
      if (users.length > 0 && decks.length > 0) {
        return [users[0], decks[0]];
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
  practiceEntries: PracticeEntryTableExtra[];
  bookmarkEntries: BookmarkEntryTable[];
  captionEntries: CaptionEntryTable[];
  videos: VideoTable[];
  pagination: PaginationMetadata;
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

  const data = await normalizeRelationWithPagination(
    Q.practiceEntries()
      .leftJoin(
        "bookmarkEntries",
        "bookmarkEntries.id",
        "practiceEntries.bookmarkEntryId"
      )
      .leftJoin(
        "captionEntries",
        "captionEntries.id",
        "bookmarkEntries.captionEntryId"
      )
      .leftJoin("videos", "videos.id", "captionEntries.videoId")
      .where("practiceEntries.deckId", deck.id)
      .orderBy("practiceEntries.createdAt", "asc"),
    ["practiceEntries", "bookmarkEntries", "captionEntries", "videos"],
    paginationParams.data
  );

  const res: LoaderData = {
    deck,
    statistics,
    ...data,
    practiceEntries: data.practiceEntries as PracticeEntryTableExtra[],
  };
  return this.serialize(res);
});

//
// action
//

export const action = makeLoader(Controller, async function () {
  tinyassert(this.request.method === "DELETE");
  const [, deck] = await requireUserAndDeck.apply(this);
  await Q.decks().delete().where("id", deck.id);
  this.flash({ content: `Deck '${deck.name}' is deleted`, variant: "info" });
  return redirect(R["/decks"]);
});

//
// component
//

export default function DefaultComponent() {
  const {
    deck,
    statistics,
    pagination,
    practiceEntries,
    bookmarkEntries,
    captionEntries,
    videos,
  }: LoaderData = useDeserialize(useLoaderData());
  const bookmarkEntriesById = useToById(bookmarkEntries);
  const captionEntriesById = useToById(captionEntries);
  const videosById = useToById(videos);

  const content = (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <DeckPracticeStatisticsComponent statistics={statistics} />
          {practiceEntries.length === 0 && <div>Empty</div>}
          {practiceEntries.map((p) => {
            const b = bookmarkEntriesById.byId[p.bookmarkEntryId];
            const c = captionEntriesById.byId[b.captionEntryId];
            const v = videosById.byId[c.videoId];
            return (
              <PracticeBookmarkEntryComponent
                key={p.id}
                practiceEntry={p}
                bookmarkEntry={b}
                captionEntry={c}
                video={v}
                deck={deck}
              />
            );
          })}
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

export function PracticeBookmarkEntryComponent({
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
  const scheduledAt = formatScheduledAt(practiceEntry.scheduledAt, new Date());
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
          <div>Scheduled {scheduledAt}</div>
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

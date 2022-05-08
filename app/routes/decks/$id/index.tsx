import { Transition } from "@headlessui/react";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import {
  Bookmark,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Disc,
  Edit,
  MoreVertical,
  Play,
  Trash2,
} from "react-feather";
import { z } from "zod";
import { PaginationComponent } from "../../../components/misc";
import { Popover } from "../../../components/popover";
import { client } from "../../../db/client.server";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PaginationMetadata,
  PracticeEntryTable,
  Q,
  UserTable,
  VideoTable,
  normalizeRelation,
  normalizeRelationWithPagination,
} from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { useToById } from "../../../utils/by-id";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { dtfDateOnly, rtf } from "../../../utils/intl";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { PageHandle } from "../../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../../utils/pagination";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { Timedelta } from "../../../utils/timedelta";
import { zStringToInteger } from "../../../utils/zod-utils";
import { MiniPlayer } from "../../bookmarks";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <NavBarMenuComponent />,
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

  // TODO: coverage
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
      .leftJoin(
        "practiceActions",
        "practiceActions.practiceEntryId",
        "practiceEntries.id"
      )
      .where("practiceEntries.deckId", deck.id)
      .groupBy("practiceEntries.id")
      .orderBy("practiceEntries.createdAt", "asc"),
    ["practiceEntries", "bookmarkEntries", "captionEntries", "videos"],
    paginationParams.data,
    {
      clearJoinForTotal: true,
      selectExtra: {
        practiceActionsCount: client.raw("COUNT(practiceActions.id)"),
      },
    }
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
  assert(this.request.method === "DELETE");
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
          {/* TODO(refactor): copied from `practice.tsx` */}
          <div className="w-full flex items-center bg-white p-2 px-4">
            <div className="flex-none text-sm text-gray-600 uppercase">
              Progress
            </div>
            <div className="grow flex px-4">
              <div className="grow" />
              <div className="flex-none text-blue-500">
                {statistics.NEW.daily} / {statistics.NEW.total}
              </div>
              <div className="grow text-center text-gray-400">-</div>
              <div className="flex-none text-red-500">
                {statistics.LEARN.daily} / {statistics.LEARN.total}
              </div>
              <div className="grow text-center text-gray-400">-</div>
              <div className="flex-none text-green-500">
                {statistics.REVIEW.daily} / {statistics.REVIEW.total}
              </div>
              <div className="grow" />
            </div>
          </div>
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
                practiceActionsCount={p.practiceActionsCount}
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

export function PracticeBookmarkEntryComponent({
  video,
  captionEntry,
  bookmarkEntry,
  practiceEntry,
  practiceActionsCount,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  practiceEntry: PracticeEntryTable;
  practiceActionsCount: number;
  showAutoplay?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const scheduledAt = formatScheduledAt(practiceEntry.scheduledAt, new Date());
  return (
    <div
      className="border border-gray-200 flex flex-col"
      data-test="bookmark-entry"
    >
      <div
        className={`flex flex-col p-2 gap-2 w-full items-stretch
          ${open && "border-b border-gray-200 border-dashed"}
        `}
      >
        <div
          className="flex gap-2 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <div className="flex-none h-[20px] flex items-center">
            {practiceEntry.queueType === "NEW" && (
              <Circle size={16} className="text-blue-400" />
            )}
            {practiceEntry.queueType === "LEARN" && (
              <Disc size={16} className="text-red-300" />
            )}
            {practiceEntry.queueType === "REVIEW" && (
              <CheckCircle size={16} className="text-green-400" />
            )}
          </div>
          <div
            className="grow text-sm cursor-pointer"
            data-test="bookmark-entry-text"
          >
            {bookmarkEntry.text}
          </div>
        </div>
        <div className="relative flex items-center gap-2 ml-6 text-xs text-gray-500">
          {/* TODO: show practiceActions history (in modal?) */}
          <div>Answered {formatCount(practiceActionsCount)}</div>
          {"⋅"}
          <div>Scheduled {scheduledAt}</div>
          <div className="absolute right-0 bottom-0">
            <button
              className="flex-none btn btn-xs btn-circle btn-ghost text-gray-500"
              onClick={() => setOpen(!open)}
            >
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
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

function NavBarMenuComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  return (
    <>
      <div className="flex-none">
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className="btn btn-sm btn-ghost"
              data-test="deck-menu-popover-reference"
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
              <ul
                className="menu rounded p-3 shadow w-48 bg-base-100 text-base-content text-sm"
                data-test="deck-menu-popover-floating"
              >
                <li>
                  <Link
                    to={R["/decks/$id/practice"](deck.id)}
                    onClick={() => setOpen(false)}
                  >
                    <Play />
                    Practice
                  </Link>
                </li>
                <li>
                  <Link
                    to={R["/bookmarks"] + `?deckId=${deck.id}`}
                    onClick={() => setOpen(false)}
                  >
                    <Bookmark />
                    Bookmarks
                  </Link>
                </li>
                <li>
                  <Link
                    to={R["/decks/$id/edit"](deck.id)}
                    onClick={() => setOpen(false)}
                  >
                    <Edit />
                    Edit
                  </Link>
                </li>
                <Form
                  action={R["/decks/$id?index"](deck.id)}
                  method="delete"
                  onSubmitCapture={(e) => {
                    if (!window.confirm("Are you sure?")) {
                      e.preventDefault();
                    }
                  }}
                >
                  <li>
                    <button type="submit">
                      <Trash2 />
                      Delete
                    </button>
                  </li>
                </Form>
              </ul>
            </Transition>
          )}
        />
      </div>
    </>
  );
}

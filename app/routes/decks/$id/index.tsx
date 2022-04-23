import { Transition } from "@headlessui/react";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { Bookmark, MoreVertical, Play, Trash2 } from "react-feather";
import { z } from "zod";
import { Popover } from "../../../components/popover";
import {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  Q,
  UserTable,
} from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { useToById } from "../../../utils/by-id";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { PageHandle } from "../../../utils/page-handle";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { Timedelta } from "../../../utils/timedelta";
import { zStringToInteger } from "../../../utils/zod-utils";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <NavBarMenuComponent />,
};

// TODO
// - delete
// - show statistics

const PARAMS_SCHEMA = z.object({
  id: zStringToInteger,
});

export async function requireUserAndDeck(
  this: Controller
): Promise<[UserTable, DeckTable]> {
  const user = await this.requireUser();
  const parsed = PARAMS_SCHEMA.safeParse(this.args.params);
  if (parsed.success) {
    const { id } = parsed.data;
    const deck = await Q.decks().where({ id, userId: user.id }).first();
    if (deck) {
      return [user, deck];
    }
  }
  this.flash({ content: "Deck not found", variant: "error" });
  throw redirect(R["/decks"]);
}

//
// loader
//

interface LoaderData {
  deck: DeckTable;
  statistics: DeckPracticeStatistics;
  practiceEntries: PracticeEntryTable[]; // TODO: paginate
  bookmarkEntries: BookmarkEntryTable[];
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const system = new PracticeSystem(user, deck);
  const now = new Date();
  const statistics = await system.getStatistics(now);
  const practiceEntries = await Q.practiceEntries()
    .where("deckId", deck.id)
    .orderBy("createdAt", "asc");
  const bookmarkEntries = await Q.bookmarkEntries().whereIn(
    "id",
    practiceEntries.map((e) => e.bookmarkEntryId)
  );
  const res: LoaderData = {
    deck,
    statistics,
    practiceEntries,
    bookmarkEntries,
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
  const { statistics, practiceEntries, bookmarkEntries }: LoaderData =
    useDeserialize(useLoaderData());
  const bookmarkEntriesById = useToById(bookmarkEntries);

  return (
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
          {practiceEntries.map((practiceEntry) => (
            <PracticeEntryComponent
              key={practiceEntry.id}
              practiceEntry={practiceEntry}
              bookmarkEntry={
                bookmarkEntriesById.byId[practiceEntry.bookmarkEntryId]
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PracticeEntryComponent({
  practiceEntry,
  bookmarkEntry,
}: {
  practiceEntry: PracticeEntryTable;
  bookmarkEntry: BookmarkEntryTable;
}) {
  return (
    <div
      key={practiceEntry.id}
      className={`
        border border-gray-200 border-l-2 flex items-center p-2 gap-2
        ${practiceEntry.queueType === "NEW" && "border-l-blue-400"}
        ${practiceEntry.queueType === "LEARN" && "border-l-red-400"}
        ${practiceEntry.queueType === "REVIEW" && "border-l-green-400"}
      `}
    >
      <div className="grow pl-2 text-sm" title={bookmarkEntry.text}>
        {bookmarkEntry.text}
      </div>
      <div className="flex-none text-xs text-gray-400">
        {formatScheduledAt(practiceEntry.scheduledAt, new Date())}
      </div>
    </div>
  );
}

const IntlRtf = new Intl.RelativeTimeFormat("en");

function formatScheduledAt(date: Date, now: Date): string {
  const delta = Timedelta.difference(date, now);
  if (delta.value <= 0) {
    return "";
  }
  const n = delta.normalize();
  for (const unit of ["days", "hours", "minutes"] as const) {
    if (n[unit] > 0) {
      return IntlRtf.format(n[unit], unit);
    }
  }
  return IntlRtf.format(n.seconds, "seconds");
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
                <Form
                  action={R["/decks/$id"](deck.id) + "?index"}
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

import { Link } from "@remix-run/react";
import React from "react";
import { PaginationComponent } from "#components/misc";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  VideoTable,
} from "#db/models";
import { $R } from "#misc/routes";
import { MiniPlayer } from "#routes/bookmarks/_ui";
import {
  DeckNavBarMenuComponent,
  QueueStatisticsComponent,
  QueueTypeIcon,
} from "#routes/decks/$id/_ui";
import type {
  LoaderData,
  PracticeEntryTableExtra,
} from "#routes/decks/$id/index.server";
import { intl, intlWrapper } from "#utils/intl";
import { useLeafLoaderData, useLoaderDataExtra } from "#utils/loader-utils";
import { cls } from "#utils/misc";
import type { PageHandle } from "#utils/page-handle";

export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

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
          bookmarkEntries={[bookmarkEntry]}
          autoplay={false}
          defaultIsRepeating={false}
        />
      )}
    </div>
  );
}

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck } = useLeafLoaderData() as LoaderData;
  return <>{deck.name}</>;
}

import { tinyassert } from "@hiogawa/utils";
import { useFetcher, useLoaderData, useTransition } from "@remix-run/react";
import React from "react";
import { E, T, db, findOne } from "../../../db/drizzle-client.server";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PRACTICE_ACTION_TYPES,
  PracticeActionType,
  PracticeEntryTable,
  VideoTable,
} from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { toForm } from "../../../utils/url-data";
import { BookmarkEntryComponent } from "../../bookmarks";
import {
  DeckNavBarMenuComponent,
  DeckPracticeStatisticsComponent,
  requireUserAndDeck,
} from "./index";
import type { NewPracticeActionRequest } from "./new-practice-action";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

//
// loader
//

interface LoaderData {
  deck: DeckTable;
  statistics: DeckPracticeStatistics;
  // TODO: improve practice status message (e.g. it shouldn't say "finished" when there's no practice entry to start with)
  data:
    | {
        finished: true;
      }
    | {
        finished: false;
        practiceEntry: PracticeEntryTable;
        bookmarkEntry: BookmarkEntryTable;
        captionEntry: CaptionEntryTable;
        video: VideoTable;
      };
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);
  const system = new PracticeSystem(user, deck);
  const now = new Date();
  const statistics = system.getStatistics(now); // defer await
  const practiceEntry = await system.getNextPracticeEntry(now);
  let data: LoaderData["data"];
  if (!practiceEntry) {
    data = { finished: true };
  } else {
    const row = await findOne(
      db
        .select()
        .from(T.bookmarkEntries)
        .innerJoin(
          T.captionEntries,
          E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
        )
        .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
        .where(E.eq(T.bookmarkEntries.id, practiceEntry.bookmarkEntryId))
    );
    tinyassert(row);
    data = {
      finished: false,
      practiceEntry,
      bookmarkEntry: row.bookmarkEntries,
      // @ts-expect-error null to undefined
      captionEntry: row.captionEntries,
      // @ts-expect-error null to undefined
      video: row.videos,
    };
  }
  const res: LoaderData = { deck, statistics: await statistics, data };
  return this.serialize(res);
});

//
// component
//

export default function DefaultComponent() {
  const { deck, statistics, data }: LoaderData = useDeserialize(
    useLoaderData()
  );

  return (
    <div className="h-full w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <DeckPracticeStatisticsComponent
            statistics={statistics}
            currentQueueType={
              data.finished ? undefined : data.practiceEntry.queueType
            }
          />
          {data.finished ? (
            <div className="w-full text-center">Practice is completed!</div>
          ) : (
            <PracticeComponent
              deck={deck}
              practiceEntry={data.practiceEntry}
              bookmarkEntry={data.bookmarkEntry}
              captionEntry={data.captionEntry}
              video={data.video}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PracticeComponent({
  deck,
  practiceEntry,
  bookmarkEntry,
  captionEntry,
  video,
}: {
  deck: DeckTable;
  practiceEntry: PracticeEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  captionEntry: CaptionEntryTable;
  video: VideoTable;
}) {
  const fetcher = useFetcher();
  const transition = useTransition();
  const isLoading =
    fetcher.state !== "idle" ||
    (transition.state !== "idle" &&
      transition.location?.pathname.startsWith(
        R["/decks/$id/practice"](deck.id)
      ));
  const [loadingActionType, setLoadingActionType] =
    React.useState<PracticeActionType>();

  function onClickAction(actionType: PracticeActionType) {
    setLoadingActionType(actionType);
    const data: NewPracticeActionRequest = {
      practiceEntryId: practiceEntry.id,
      now: new Date(),
      actionType,
    };
    fetcher.submit(toForm(data), {
      action: R["/decks/$id/new-practice-action"](deck.id),
      method: "post",
    });
  }

  return (
    <>
      <div className="grow w-full flex flex-col">
        <BookmarkEntryComponent
          // force remount when going next practice
          key={practiceEntry.id}
          video={video}
          captionEntry={captionEntry}
          bookmarkEntry={bookmarkEntry}
          showAutoplay
        />
      </div>
      <div className="flex justify-center pb-4">
        <div className="flex gap-2">
          {PRACTICE_ACTION_TYPES.map((type) => (
            <button
              key={type}
              className={cls(
                "antd-btn antd-btn-default px-3 py-0.5",
                isLoading && loadingActionType === type && "antd-btn-loading"
              )}
              disabled={isLoading}
              onClick={() => onClickAction(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());
  return (
    <span>
      {deck.name}{" "}
      <span className="text-colorTextSecondary text-sm">(practice)</span>
    </span>
  );
}

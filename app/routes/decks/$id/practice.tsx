import { useFetcher, useLoaderData, useTransition } from "@remix-run/react";
import * as React from "react";
import { Spinner } from "../../../components/misc";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PRACTICE_ACTION_TYPES,
  PracticeActionType,
  PracticeEntryTable,
  Q,
  VideoTable,
  normalizeRelation,
} from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { PageHandle } from "../../../utils/page-handle";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { toForm } from "../../../utils/url-data";
import { BookmarkEntryComponent } from "../../bookmarks";
import { NewPracticeActionRequest } from "./new-practice-action";
import { requireUserAndDeck } from "./index";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <NavBarMenuComponent />,
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
  const statistics = system.getStatistics(now); // delay await
  const practiceEntry = await system.getNextPracticeEntry(now);
  let data: LoaderData["data"];
  if (!practiceEntry) {
    data = { finished: true };
  } else {
    const { bookmarkEntries, captionEntries, videos } = await normalizeRelation(
      Q.bookmarkEntries()
        .leftJoin(
          "captionEntries",
          "captionEntries.id",
          "bookmarkEntries.captionEntryId"
        )
        .leftJoin("videos", "videos.id", "captionEntries.videoId")
        .where("bookmarkEntries.id", practiceEntry.bookmarkEntryId),
      ["bookmarkEntries", "captionEntries", "videos"]
    );
    assert(bookmarkEntries[0]);
    assert(captionEntries[0]);
    assert(videos[0]);
    data = {
      finished: false,
      practiceEntry,
      bookmarkEntry: bookmarkEntries[0],
      captionEntry: captionEntries[0],
      video: videos[0],
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
          <div className="w-full flex items-center bg-white p-2 px-4">
            <div className="flex-none text-sm text-gray-600 uppercase">
              Progress
            </div>
            <div className="grow flex px-4">
              <div className="grow" />
              <div
                className={`flex-none text-blue-500 ${
                  !data.finished &&
                  data.practiceEntry.queueType === "NEW" &&
                  "underline"
                }`}
              >
                {statistics.NEW.daily} / {statistics.NEW.total}
              </div>
              <div className="grow text-center text-gray-400">-</div>
              <div
                className={`flex-none text-red-500 ${
                  !data.finished &&
                  data.practiceEntry.queueType === "LEARN" &&
                  "underline"
                }`}
              >
                {statistics.LEARN.daily} / {statistics.LEARN.total}
              </div>
              <div className="grow text-center text-gray-400">-</div>
              <div
                className={`flex-none text-green-500 ${
                  !data.finished &&
                  data.practiceEntry.queueType === "REVIEW" &&
                  "underline"
                }`}
              >
                {statistics.REVIEW.daily} / {statistics.REVIEW.total}
              </div>
              <div className="grow" />
            </div>
          </div>
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
      transition.location?.pathname.startsWith(R["/decks/$id"](deck.id)));

  function onClickAction(actionType: PracticeActionType) {
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
        {isLoading ? (
          <div className="w-full flex justify-center">
            <Spinner className="w-16 h-16" />
          </div>
        ) : (
          <BookmarkEntryComponent
            video={video}
            captionEntry={captionEntry}
            bookmarkEntry={bookmarkEntry}
            showAutoplay
          />
        )}
      </div>
      <div className="flex justify-center pt-2 pb-4">
        <div className="btn-group">
          {PRACTICE_ACTION_TYPES.map((type) => (
            <button
              key={type}
              className={`btn ${isLoading && "btn-disabled"}`}
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
  return <>{deck.name} (practice)</>;
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  return <></>;
}

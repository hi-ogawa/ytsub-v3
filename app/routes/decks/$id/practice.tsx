import { tinyassert } from "@hiogawa/utils";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";
import { E, T, db, findOne } from "../../../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PracticeEntryTable,
  VideoTable,
} from "../../../db/models";
import { PRACTICE_ACTION_TYPES, PracticeActionType } from "../../../db/types";
import { $R } from "../../../misc/routes";
import { trpc } from "../../../trpc/client";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import {
  DeckPracticeStatistics,
  PracticeSystem,
} from "../../../utils/practice-system";
import { BookmarkEntryComponent } from "../../bookmarks";
import {
  DeckNavBarMenuComponent,
  DeckPracticeStatisticsComponent,
  requireUserAndDeck,
} from "./index";

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
      captionEntry: row.captionEntries,
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
  const navigate = useNavigate();
  const newPracticeActionMutation = useMutation({
    ...trpc.decks_practiceActionsCreate.mutationOptions(),
    onSuccess: () => {
      // reload to proceed to next practice
      navigate($R["/decks/$id/practice"](deck));
    },
    onError: () => {
      toast.error("Failed to submit answer");
    },
  });

  const [lastActionType, setLastActionType] =
    React.useState<PracticeActionType>();

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
                newPracticeActionMutation.isLoading &&
                  lastActionType === type &&
                  "antd-btn-loading"
              )}
              disabled={newPracticeActionMutation.isLoading}
              onClick={() => {
                setLastActionType(type);
                newPracticeActionMutation.mutate({
                  deckId: deck.id,
                  actionType: type,
                  practiceEntryId: practiceEntry.id,
                });
              }}
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

import { Transition } from "@headlessui/react";
import { useLoaderData } from "@remix-run/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";
import { transitionProps } from "../../../components/misc";
import type {
  BookmarkEntryTable,
  CaptionEntryTable,
  DeckTable,
  PracticeEntryTable,
  VideoTable,
} from "../../../db/models";
import { PRACTICE_ACTION_TYPES, PracticeActionType } from "../../../db/types";
import { trpc } from "../../../trpc/client";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
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
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  const res: LoaderData = { deck };
  return this.serialize(res);
});

//
// component
//

export default function DefaultComponent() {
  const { deck }: LoaderData = useDeserialize(useLoaderData());

  const nextPracticeQuery = useQuery({
    ...trpc.decks_nextPracticeEntry.queryOptions({
      deckId: deck.id,
    }),
    keepPreviousData: true,
  });

  return (
    <div className="h-full w-full flex justify-center">
      <div className="h-full w-full max-w-lg relative">
        <div className="h-full flex flex-col p-2 gap-2">
          {nextPracticeQuery.isSuccess && (
            <>
              <DeckPracticeStatisticsComponent
                statistics={nextPracticeQuery.data.statistics}
                currentQueueType={
                  nextPracticeQuery.data.practiceEntry?.queueType
                }
              />
              {nextPracticeQuery.data.finished && (
                <div className="w-full text-center">Practice is completed!</div>
              )}
              {!nextPracticeQuery.data.finished && (
                <PracticeComponent
                  deck={deck}
                  practiceEntry={nextPracticeQuery.data.practiceEntry}
                  bookmarkEntry={nextPracticeQuery.data.bookmarkEntry}
                  captionEntry={nextPracticeQuery.data.captionEntry}
                  video={nextPracticeQuery.data.video}
                  loadNext={() => nextPracticeQuery.refetch()}
                  isLoadingNext={nextPracticeQuery.isFetching}
                />
              )}
            </>
          )}
        </div>
        {/* spinner for initial mount */}
        <Transition
          show={nextPracticeQuery.isFetching}
          className="duration-500 antd-body antd-spin-overlay-20"
          {...transitionProps("opacity-0", "opacity-50")}
        />
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
  loadNext,
  isLoadingNext,
}: {
  deck: DeckTable;
  practiceEntry: PracticeEntryTable;
  bookmarkEntry: BookmarkEntryTable;
  captionEntry: CaptionEntryTable;
  video: VideoTable;
  loadNext: () => void;
  isLoadingNext: boolean;
}) {
  const newPracticeActionMutation = useMutation({
    ...trpc.decks_practiceActionsCreate.mutationOptions(),
    onSuccess: () => {
      loadNext();
    },
    onError: () => {
      toast.error("Failed to submit answer");
    },
  });

  // extra state for a bit nicer loading indicator
  const [lastActionType, setLastActionType] =
    React.useState<PracticeActionType>();

  const isLoading = isLoadingNext || newPracticeActionMutation.isLoading;

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
          isLoading={isLoading}
        />
      </div>
      <div className="flex justify-center pb-4">
        <div className="flex gap-2">
          {PRACTICE_ACTION_TYPES.map((type) => (
            <button
              key={type}
              className={cls(
                "antd-btn antd-btn-default px-3 py-0.5",
                isLoading && lastActionType === type && "antd-btn-loading"
              )}
              disabled={isLoading}
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
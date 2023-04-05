import { Transition } from "@headlessui/react";
import { mapOption } from "@hiogawa/utils";
import { useFetcher, useFetchers, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import toast from "react-hot-toast";
import {
  PaginationComponent,
  VideoComponent,
  transitionProps,
} from "../../components/misc";
import { useModal } from "../../components/modal";
import { E, T, db, toPaginationResult } from "../../db/drizzle-client.server";
import type {
  DeckTable,
  PaginationMetadata,
  UserTable,
  VideoTable,
} from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import {
  PAGINATION_PARAMS_SCHEMA,
  PaginationParams,
} from "../../utils/pagination";
import { toForm } from "../../utils/url-data";
import type {
  NewPracticeEntryRequest,
  NewPracticeEntryResponse,
} from "../decks/$id/new-practice-entry";
import { fetchDecksIndexDetail } from "../decks/index-detail";

export const handle: PageHandle = {
  navBarTitle: () => "Your Videos",
};

// TODO
// - filter (`<Filter />` in `navBarMenuComponent`)
//   - by language
//   - by author
// - order
//   - by "lastWatchedAt"
// - better layout for desktop

export interface VideosLoaderData {
  videos: VideoTable[];
  pagination: PaginationMetadata;
}

export async function getVideosLoaderData(
  paginationParams: PaginationParams,
  userId?: number
): Promise<VideosLoaderData> {
  const [videos, pagination] = await toPaginationResult(
    db
      .select()
      .from(T.videos)
      .where(userId ? E.eq(T.videos.userId, userId) : E.isNull(T.videos.userId))
      .orderBy(E.desc(T.videos.updatedAt)),
    paginationParams
  );
  return { videos, pagination };
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    this.flash({
      content: "Signin required.",
      variant: "error",
    });
    return redirect(R["/users/signin"]);
  }

  const parsed = PAGINATION_PARAMS_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/bookmarks"]);
  }

  const data: VideosLoaderData = await getVideosLoaderData(
    parsed.data,
    user.id
  );
  return this.serialize(data);
});

//
// component
//

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const data: VideosLoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent {...data} currentUser={currentUser} />;
}

export function VideoListComponent({
  videos,
  pagination,
  currentUser,
}: VideosLoaderData & {
  currentUser?: UserTable;
}) {
  // cannot run this effect in `VideoComponentExtra` because the component is already gone when action returns response
  const fetchers = useFetchers();

  React.useEffect(() => {
    for (const fetcher of fetchers) {
      if (
        fetcher.type === "done" &&
        // extra runtime check for remix (typing) issue? https://github.com/hi-ogawa/ytsub-v3/issues/179
        fetcher.data &&
        fetcher.data.type === "DELETE /videos/$id"
      ) {
        if (fetcher.data.success) {
          toast.success("Deletion success");
        } else {
          toast.error("Deleted failed");
        }
      }
    }
  }, [fetchers]);

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            {/* TODO: CTA when empty */}
            {videos.length === 0 && <div>Empty</div>}
            {videos.map((video) => (
              <VideoComponentExtra
                key={video.id}
                video={video}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="w-full h-8" /> {/* fake padding to allow scrool more */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent pagination={pagination} />
      </div>
    </>
  );
}

function VideoComponentExtra({
  video,
  currentUser,
}: {
  video: VideoTable;
  currentUser?: UserTable;
}) {
  const fetcher = useFetcher();
  const modal = useModal();
  const addToDeckDisabled = !video.bookmarkEntriesCount;

  const videoComponent = (
    <VideoComponent
      key={video.id}
      video={video}
      bookmarkEntriesCount={video.bookmarkEntriesCount}
      isLoading={fetcher.state !== "idle"}
      actions={
        currentUser &&
        currentUser.id === video.userId && (
          <>
            <li>
              <button
                data-test="video-component-add-to-deck-button"
                className="w-full antd-menu-item p-2 flex items-center gap-2"
                disabled={addToDeckDisabled}
                onClick={() => {
                  if (!addToDeckDisabled) {
                    modal.setOpen(true);
                  }
                }}
              >
                <span className="i-ri-add-box-line w-5 h-5"></span>
                Add to Deck
              </button>
            </li>
            <li>
              <fetcher.Form
                method="delete"
                action={R["/videos/$id"](video.id)}
                data-test="video-delete-form"
                onSubmitCapture={(e) => {
                  if (!window.confirm("Are you sure?")) {
                    e.preventDefault();
                  }
                }}
              >
                <button
                  type="submit"
                  className="w-full antd-menu-item p-2 flex items-center gap-2"
                >
                  <span className="i-ri-delete-bin-line w-5 h-5"></span>
                  Delete
                </button>
              </fetcher.Form>
            </li>
          </>
        )
      }
    />
  );

  return (
    <>
      {videoComponent}
      <modal.Wrapper>
        <AddToDeckComponent
          videoId={video.id}
          bookmarkEntriesCount={video.bookmarkEntriesCount}
          onSuccess={() => modal.setOpen(false)}
        />
      </modal.Wrapper>
    </>
  );
}

function AddToDeckComponent({
  videoId,
  bookmarkEntriesCount,
  onSuccess,
}: {
  videoId: number;
  bookmarkEntriesCount: number;
  onSuccess: () => void;
}) {
  // get decks
  const decksQuery = useQuery({
    queryKey: [R["/decks/index-detail"], videoId],
    queryFn: async () => fetchDecksIndexDetail({ videoId }),
  });

  // create new practice entries
  const fetcher = useFetcher();

  React.useEffect(() => {
    // It doesn't have to wait until "done" since action response is ready on "actionReload"
    // (actionSubmission => actionReload => done)
    if (fetcher.data) {
      const data: NewPracticeEntryResponse = fetcher.data;
      if (data.ok) {
        toast.success(`Added ${data.value.ids.length} to a deck`);
        decksQuery.refetch();
        onSuccess();
      } else {
        toast.error("Failed to add to a deck");
      }
    }
  }, [fetcher.data]);

  function onClickPlus(deck: DeckTable) {
    if (!window.confirm("Are you sure?")) {
      toast.error("Cancelled to add to a deck");
      return;
    }

    const data: NewPracticeEntryRequest = {
      videoId,
      now: new Date(),
    };
    fetcher.submit(toForm(data), {
      action: R["/decks/$id/new-practice-entry"](deck.id),
      method: "post",
    });
  }

  const isLoading = decksQuery.isLoading || fetcher.state !== "idle";

  return (
    <div
      className="flex flex-col gap-2 p-4 relative"
      data-test="add-to-deck-component"
    >
      <div className="text-lg flex items-center gap-2">
        Select a Deck
        <span className="text-colorTextLabel">({bookmarkEntriesCount})</span>
      </div>
      <ul className="flex flex-col gap-2">
        {decksQuery.isSuccess &&
          decksQuery.data.decks.map((deck) => (
            <li key={deck.id}>
              <button
                className="w-full antd-menu-item p-2 flex items-center"
                onClick={() => onClickPlus(deck)}
              >
                <div className="flex-1 flex items-center gap-1">
                  <span>{deck.name}</span>
                  {mapOption(
                    decksQuery.data.counts.find((row) => row.deckId === deck.id)
                      ?.count,
                    (c) => (
                      <span className="text-colorTextLabel">({c})</span>
                    )
                  )}
                </div>
                <span className="i-ri-add-box-line w-5 h-5"></span>
              </button>
            </li>
          ))}
      </ul>
      <Transition
        show={isLoading}
        className="duration-500 antd-body antd-spin-overlay-20"
        {...transitionProps("opacity-0", "opacity-100")}
      />
    </div>
  );
}

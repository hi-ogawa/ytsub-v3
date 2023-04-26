import { Transition } from "@headlessui/react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { trpc } from "../../trpc/client";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { toastInfo } from "../../utils/flash-message-hook";
import { useDeserialize } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import {
  PAGINATION_PARAMS_SCHEMA,
  PaginationParams,
} from "../../utils/pagination";

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
      .orderBy(E.desc(T.videos.updatedAt), E.desc(T.videos.id)),
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
      <div className="w-full h-8" /> {/* padding for scroll */}
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
  const navigate = useNavigate();
  const deleteVideoMutation = useMutation({
    ...trpc.videos_destroy.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully deleted a video");
      navigate(R["/videos"]); // refetch
    },
    onError: () => {
      toast.error("Failed to delete a video");
    },
  });
  const modal = useModal();
  const addToDeckDisabled = !video.bookmarkEntriesCount;

  const videoComponent = (
    <VideoComponent
      key={video.id}
      video={video}
      bookmarkEntriesCount={video.bookmarkEntriesCount}
      isLoading={deleteVideoMutation.isLoading}
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
              <button
                className="w-full antd-menu-item p-2 flex items-center gap-2"
                data-test="video-delete-form"
                onClick={() => {
                  if (!window.confirm("Are you sure?")) {
                    return;
                  }
                  deleteVideoMutation.mutate({ videoId: video.id });
                }}
              >
                <span className="i-ri-delete-bin-line w-5 h-5"></span>
                Delete
              </button>
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
  const decksQuery = useQuery(
    trpc.decks_practiceEntriesCount.queryOptions({ videoId })
  );

  // create new practice entries
  const newPracticeEntryMutation = useMutation({
    ...trpc.decks_practiceEntriesCreate.mutationOptions(),
    onSuccess: (data) => {
      toast.success(`Added ${data.practiceEntryIds.length} to a deck`);
      decksQuery.refetch();
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to add to a deck");
    },
  });

  function onClickPlus(deck: DeckTable) {
    if (!window.confirm(`Please confirm to add bookmarks to '${deck.name}'.`)) {
      toastInfo("Cancelled to add to a deck");
      return;
    }
    newPracticeEntryMutation.mutate({ videoId, deckId: deck.id });
  }

  const isLoading = decksQuery.isLoading || newPracticeEntryMutation.isLoading;

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
          decksQuery.data.map(({ deck, practiceEntriesCount }) => (
            <li key={deck.id}>
              <button
                className="w-full antd-menu-item p-2 flex items-center"
                onClick={() => onClickPlus(deck)}
              >
                <div className="flex-1 flex items-center gap-1">
                  <span>{deck.name}</span>
                  {practiceEntriesCount > 0 && (
                    <span className="text-colorTextLabel">
                      ({practiceEntriesCount})
                    </span>
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

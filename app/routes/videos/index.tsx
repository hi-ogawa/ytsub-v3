import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { useNavigate } from "@remix-run/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  PaginationComponent,
  VideoComponent,
  transitionProps,
} from "../../components/misc";
import { useModal } from "../../components/modal";
import type { DeckTable, UserTable, VideoTable } from "../../db/models";
import { R } from "../../misc/routes";
import { rpcClientQuery } from "../../trpc/client";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import { toastInfo } from "../../utils/toast-utils";

// TODO
// - filter (`<Filter />` in `navBarMenuComponent`)
//   - by language
//   - by author
// - order
//   - by "lastWatchedAt"
// - better layout for desktop

export { loader } from "./index.server";
import type { VideosLoaderData } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Your Videos",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}

// reused for routes/index.tsx
export function VideoListComponent({
  videos,
  pagination,
  currentUser,
}: VideosLoaderData) {
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
    ...rpcClientQuery.videos_destroy.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully deleted a video");
      navigate(R["/videos"]); // refetch
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to delete a video");
    },
  });
  const modal = useModal();
  const addToDeckDisabled = !video.bookmarkEntriesCount;

  return (
    <VideoComponent
      key={video.id}
      video={video}
      bookmarkEntriesCount={video.bookmarkEntriesCount}
      isLoading={deleteVideoMutation.isLoading}
      actions={
        currentUser &&
        currentUser.id === video.userId &&
        ((context) => (
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
              <modal.Wrapper>
                <AddToDeckComponent
                  videoId={video.id}
                  bookmarkEntriesCount={video.bookmarkEntriesCount}
                  onSuccess={() => {
                    modal.setOpen(false);
                    context.onOpenChange(false);
                  }}
                />
              </modal.Wrapper>
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
        ))
      }
    />
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
    rpcClientQuery.decks_practiceEntriesCount.queryOptions({ videoId })
  );

  // create new practice entries
  const newPracticeEntryMutation = useMutation({
    ...rpcClientQuery.decks_practiceEntriesCreate.mutationOptions(),
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

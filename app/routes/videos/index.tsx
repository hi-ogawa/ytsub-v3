import { mapOption } from "@hiogawa/utils";
import { useFetcher, useFetchers, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import { PlusSquare, Trash2 } from "react-feather";
import {
  PaginationComponent,
  Spinner,
  VideoComponent,
} from "../../components/misc";
import { useModalV2 } from "../../components/modal-v2";
import { useSnackbar } from "../../components/snackbar";
import {
  DeckTable,
  PaginationResult,
  Q,
  UserTable,
  VideoTable,
  toPaginationResult,
} from "../../db/models";
import { R } from "../../misc/routes";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../utils/pagination";
import { toForm } from "../../utils/url-data";
import type { DecksLoaderData } from "../decks";
import type {
  NewPracticeEntryRequest,
  NewPracticeEntryResponse,
} from "../decks/$id/new-practice-entry";

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

interface LoaderData {
  pagination: PaginationResult<VideoTable>;
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

  const pagination = await toPaginationResult(
    Q.videos()
      .where("videos.userId", user.id)
      .orderBy("videos.updatedAt", "desc"),
    parsed.data,
    { clearJoin: true }
  );

  const data: LoaderData = { pagination };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const data: LoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent {...data} currentUser={currentUser} />;
}

export function VideoListComponent({
  pagination,
  currentUser,
}: LoaderData & {
  currentUser?: UserTable;
}) {
  // cannot run this effect in `VideoComponentExtra` because the component is already gone when action returns response
  const fetchers = useFetchers();
  const { enqueueSnackbar } = useSnackbar();

  React.useEffect(() => {
    for (const fetcher of fetchers) {
      if (
        fetcher.type === "done" &&
        fetcher.data.type === "DELETE /videos/$id"
      ) {
        if (fetcher.data.success) {
          enqueueSnackbar("Deleted successfuly", { variant: "success" });
        } else {
          enqueueSnackbar("Deletion failed", { variant: "error" });
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
            {pagination.data.length === 0 && <div>Empty</div>}
            {pagination.data.map((video) => (
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
  const modal = useModalV2();
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
            <li className={`${addToDeckDisabled && "disabled"}`}>
              <button
                onClick={() => {
                  if (!addToDeckDisabled) {
                    modal.setOpen(true);
                  }
                }}
                data-test="video-component-add-to-deck-button"
              >
                <PlusSquare />
                Add to Deck
              </button>
            </li>
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
              <li>
                <button type="submit">
                  <Trash2 />
                  Delete
                </button>
              </li>
            </fetcher.Form>
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
          onSuccess={() => modal.setOpen(false)}
        />
      </modal.Wrapper>
    </>
  );
}

function AddToDeckComponent({
  videoId,
  onSuccess,
}: {
  videoId: number;
  onSuccess: () => void;
}) {
  // get decks
  const fetcher1 = useFetcher();
  const data: DecksLoaderData | undefined = React.useMemo(
    () => mapOption(fetcher1.data, deserialize),
    [fetcher1.data]
  );
  React.useEffect(() => fetcher1.load(R["/decks?index"]), []);

  // create practice entries
  const fetcher2 = useFetcher();
  const { enqueueSnackbar } = useSnackbar();

  React.useEffect(() => {
    // It doesn't have to wait until "done" since action response is ready on "actionReload"
    // (actionSubmission => actionReload => done)
    if (fetcher2.data) {
      const data: NewPracticeEntryResponse = fetcher2.data;
      if (data.ok) {
        enqueueSnackbar(`Added ${data.value.ids.length} to a deck`, {
          variant: "success",
        });
        onSuccess();
      } else {
        enqueueSnackbar("Failed to add to a deck", { variant: "error" });
      }
    }
  }, [fetcher2.data]);

  function onClickPlus(deck: DeckTable) {
    const data: NewPracticeEntryRequest = {
      videoId,
      now: new Date(),
    };
    fetcher2.submit(toForm(data), {
      action: R["/decks/$id/new-practice-entry"](deck.id),
      method: "post",
    });
  }

  const isLoading = fetcher1.state !== "idle" || fetcher2.state !== "idle";

  return (
    <div
      className="border shadow-xl rounded-xl bg-base-100 p-4 flex flex-col gap-2"
      data-test="add-to-deck-component"
    >
      <div className="text-lg">Select a Deck</div>
      {data && !isLoading ? (
        <ul className="menu">
          {data.decks.map((deck) => (
            <li key={deck.id}>
              <button
                className="flex rounded"
                onClick={() => onClickPlus(deck)}
              >
                <div className="grow flex">{deck.name}</div>
                <PlusSquare className="flex-none text-gray-700" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex justify-center p-2">
          <Spinner className="w-20 h-20" />
        </div>
      )}
    </div>
  );
}

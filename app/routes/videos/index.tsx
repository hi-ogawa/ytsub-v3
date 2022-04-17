import { useFetcher, useFetchers, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { Trash2 } from "react-feather";
import { VideoComponent } from "../../components/misc";
import { useSnackbar } from "../../components/snackbar";
import { client } from "../../db/client.server";
import { UserTable, VideoTable, tables } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "Your Videos",
};

// TODO
// - pagination
// - filter (`<Filter />` in `navBarMenuComponent`)
//   - by language
//   - by author
// - order
//   - by "lastWatchedAt"
// - better layout for desktop

interface VideoTableExtra extends VideoTable {
  bookmarkEntriesCount?: number;
}

export interface HistoryLoaderData {
  videos: VideoTableExtra[];
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

  // TODO: cache "has-many" counter (https://github.com/rails/rails/blob/de53ba56cab69fb9707785a397a59ac4aaee9d6f/activerecord/lib/active_record/counter_cache.rb#L159)
  const videos: VideoTableExtra[] = await tables
    .videos()
    .select("videos.*", { bookmarkEntriesCount: client.raw("COUNT(*)") })
    .where("videos.userId", user.id)
    .orderBy("videos.updatedAt", "desc")
    .join("bookmarkEntries", "bookmarkEntries.videoId", "videos.id")
    .groupBy("videos.id");

  const data: HistoryLoaderData = { videos };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const data: HistoryLoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent videos={data.videos} currentUser={currentUser} />;
}

export function VideoListComponent({
  videos,
  currentUser,
}: {
  videos: VideoTableExtra[];
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
  );
}

function VideoComponentExtra({
  video,
  currentUser,
}: {
  video: VideoTableExtra;
  currentUser?: UserTable;
}) {
  const fetcher = useFetcher();

  return (
    <VideoComponent
      key={video.id}
      video={video}
      bookmarkEntriesCount={video.bookmarkEntriesCount}
      actions={
        currentUser &&
        currentUser.id === video.userId && (
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
                {fetcher.state === "idle" ? "Delete" : "Deleting..."}
              </button>
            </li>
          </fetcher.Form>
        )
      }
    />
  );
}

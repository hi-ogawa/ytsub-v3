import { useFetcher, useFetchers, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { Trash2 } from "react-feather";
import { PaginationComponent, VideoComponent } from "../../components/misc";
import { useSnackbar } from "../../components/snackbar";
import { client } from "../../db/client.server";
import {
  PaginationResult,
  Q,
  UserTable,
  VideoTable,
  toPaginationResult,
} from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import { PageHandle } from "../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../utils/pagination";

export const handle: PageHandle = {
  navBarTitle: "Your Videos",
};

// TODO
// - filter (`<Filter />` in `navBarMenuComponent`)
//   - by language
//   - by author
// - order
//   - by "lastWatchedAt"
// - better layout for desktop

interface VideoTableExtra extends VideoTable {
  bookmarkEntriesCount?: number;
}

interface LoaderData {
  pagination: PaginationResult<VideoTableExtra>;
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

  // TODO: cache "has-many" counter (https://github.com/rails/rails/blob/de53ba56cab69fb9707785a397a59ac4aaee9d6f/activerecord/lib/active_record/counter_cache.rb#L159)
  const pagination = await toPaginationResult(
    Q.videos()
      .select("videos.*", {
        bookmarkEntriesCount: client.raw("SUM(bookmarkEntries.id IS NOT NULL)"),
      })
      .where("videos.userId", user.id)
      .orderBy("videos.updatedAt", "desc")
      .leftJoin("bookmarkEntries", "bookmarkEntries.videoId", "videos.id")
      .groupBy("videos.id"),
    parsed.data
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
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <div className="w-full flex justify-end">
            <PaginationComponent pagination={pagination} />
          </div>
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
      isLoading={fetcher.state !== "idle"}
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
                Delete
              </button>
            </li>
          </fetcher.Form>
        )
      }
    />
  );
}

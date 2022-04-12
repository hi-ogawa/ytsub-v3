import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { zip } from "lodash";
import * as React from "react";
import { VideoComponent } from "../../components/misc";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  VideoTable,
  tables,
} from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { pushFlashMessage } from "../../utils/session-utils";

export const handle: PageHandle = {
  navBarTitle: "Bookmarks",
};

// TODO filtering etc... simlar to "/videos/history"

export interface NormalizedData<T> {
  ids: number[];
  byId: Record<number, T>;
}

export function normalizeData<T extends { id: number }>(
  data: T[]
): NormalizedData<T> {
  const ids = data.map((e) => e.id);
  const byId: Record<number, T> = Object.fromEntries(zip(ids, data));
  return { ids, byId };
}

export interface HistoryLoaderData {
  videos: VideoTable[];
  captionEntries: CaptionEntryTable[];
  bookmarks: BookmarkEntryTable[];
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    pushFlashMessage(this.session, { content: "Signin required." });
    return redirect(R["/"]);
  }
  const videos = await tables
    .videos()
    .select("*")
    .where("userId", user.id)
    .orderBy("createdAt", "desc");
  const data: HistoryLoaderData = { videos, captionEntries: [], bookmarks: [] };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: HistoryLoaderData = useDeserialize(useLoaderData());
  return <HistoryComponent videos={data.videos} />;
}

export function HistoryComponent({ videos }: { videos: VideoTable[] }) {
  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {videos.length === 0 && <div>Empty</div>}
          {videos.map((video) => (
            <VideoComponent key={video.id} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
}

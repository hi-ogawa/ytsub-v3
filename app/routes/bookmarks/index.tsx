import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { zip } from "lodash";
import * as React from "react";
import { ChevronDown, ChevronUp, X } from "react-feather";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  VideoTable,
  tables,
} from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize, useMemoWrap } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { pushFlashMessage } from "../../utils/session-utils";
import { CaptionEntryComponent, usePlayer } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: "Bookmarks",
};

// TODO filtering etc... simlar to "/videos/history"
// TODO unit test

export interface ById<T> {
  ids: number[];
  byId: Record<number, T>;
}

export function toById<T extends { id: number }>(data: T[]): ById<T> {
  const ids = data.map((e) => e.id);
  const byId: Record<number, T> = Object.fromEntries(zip(ids, data));
  return { ids, byId };
}

interface HistoryLoaderData {
  videos: VideoTable[];
  captionEntries: CaptionEntryTable[];
  bookmarkEntries: BookmarkEntryTable[];
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.currentUser();
  if (!user) {
    // TODO: it doesn't work probably because root loader is not reloaded during this navigation...
    pushFlashMessage(this.session, {
      content: "Signin required.",
      variant: "error",
    });
    return redirect(R["/users/signin"]);
  }
  // TODO: optimize query
  // TODO: order bookmark entries by captionEntry's index and offset
  const bookmarkEntries = await tables
    .bookmarkEntries()
    .select("*")
    .where("userId", user.id)
    .orderBy("createdAt", "desc");
  const videoIds = bookmarkEntries.map((x) => x.videoId);
  const captionEntryIds = bookmarkEntries.map((x) => x.captionEntryId);
  const videos = await tables.videos().select("*").whereIn("id", videoIds);
  const captionEntries = await tables
    .captionEntries()
    .select("*")
    .whereIn("id", captionEntryIds);
  const data: HistoryLoaderData = { videos, captionEntries, bookmarkEntries };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: HistoryLoaderData = useDeserialize(useLoaderData());
  return <ComponentImpl {...data} />;
}

export function ComponentImpl(props: HistoryLoaderData) {
  // TODO: type inference
  const videos = useMemoWrap(toById, props.videos) as ById<VideoTable>;
  const captionEntries = useMemoWrap(
    toById,
    props.captionEntries
  ) as ById<CaptionEntryTable>;
  const bookmarkEntries = props.bookmarkEntries;

  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {/* TODO: CTA when empty */}
          {bookmarkEntries.length === 0 && <div>Empty</div>}
          {bookmarkEntries.map((bookmarkEntry) => (
            <BookmarkEntryComponent
              key={bookmarkEntry.id}
              video={videos.byId[bookmarkEntry.videoId]}
              captionEntry={captionEntries.byId[bookmarkEntry.captionEntryId]}
              bookmarkEntry={bookmarkEntry}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookmarkEntryComponent({
  video,
  captionEntry,
  bookmarkEntry,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
  bookmarkEntry: BookmarkEntryTable;
}) {
  let [open, setOpen] = React.useState(false);

  return (
    <div className="border border-gray-200 flex flex-col">
      <div className="flex items-center p-2 gap-2">
        <button
          className="flex-none btn btn-xs btn-circle btn-ghost text-gray-500"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div
          className="grow text-sm cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {bookmarkEntry.text}
        </div>
        <button
          className="flex-none btn btn-xs btn-circle btn-ghost text-gray-500"
          onClick={() => {}}
        >
          <X size={16} />
        </button>
      </div>
      {open && <MiniPlayer video={video} captionEntry={captionEntry} />}
    </div>
  );
}

function MiniPlayer({
  video,
  captionEntry,
}: {
  video: VideoTable;
  captionEntry: CaptionEntryTable;
}) {
  const { begin } = captionEntry;
  const [playerRef, playerLoading] = usePlayer({
    defaultOptions: {
      videoId: video.videoId,
      playerVars: { start: Math.max(0, Math.floor(begin) - 1) },
    },
  });
  return (
    <div className="w-full flex flex-col items-center p-2 pt-0">
      <div className="relative w-full">
        <div className="relative pt-[56.2%]">
          <div className="absolute top-0 w-full h-full" ref={playerRef} />
        </div>
        {playerLoading && (
          <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
            <div
              className="w-20 h-20 rounded-full animate-spin"
              style={{
                border: "3px solid #999",
                borderLeft: "3px solid #ddd",
                borderTop: "3px solid #ddd",
              }}
            />
          </div>
        )}
      </div>
      {/* TODO: highlight bookmark text */}
      <CaptionEntryComponent
        entry={captionEntry}
        // TODO
        onClickEntryPlay={() => {}}
        onClickEntryRepeat={() => {}}
        isPlaying={false}
        border={false}
      />
    </div>
  );
}

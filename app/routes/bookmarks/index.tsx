import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { ChevronDown, ChevronUp, X } from "react-feather";
import { PaginationComponent } from "../../components/misc";
import {
  BookmarkEntryTable,
  CaptionEntryTable,
  PaginationResult,
  VideoTable,
  tables,
  toPaginationResult,
} from "../../db/models";
import { R } from "../../misc/routes";
import { useToById } from "../../utils/by-id";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../utils/pagination";
import { CaptionEntryComponent, usePlayer } from "../videos/$id";

export const handle: PageHandle = {
  navBarTitle: "Bookmarks",
};

interface LoaderData {
  pagination: PaginationResult<BookmarkEntryTable>;
  videos: VideoTable[];
  captionEntries: CaptionEntryTable[];
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
    tables
      .bookmarkEntries()
      .select("*")
      .where("userId", user.id)
      .orderBy("createdAt", "desc"),
    parsed.data
  );
  const bookmarkEntries = pagination.data;
  const videoIds = bookmarkEntries.map((x) => x.videoId);
  const captionEntryIds = bookmarkEntries.map((x) => x.captionEntryId);
  const videos = await tables.videos().select("*").whereIn("id", videoIds);
  const captionEntries = await tables
    .captionEntries()
    .select("*")
    .whereIn("id", captionEntryIds);
  const data: LoaderData = {
    videos,
    captionEntries,
    pagination,
  };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <ComponentImpl {...data} />;
}

export function ComponentImpl(props: LoaderData) {
  const videos = useToById(props.videos);
  const captionEntries = useToById(props.captionEntries);
  const bookmarkEntries = props.pagination.data;

  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          <div className="w-full flex justify-end">
            <PaginationComponent pagination={props.pagination} />
          </div>
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

import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { isNil } from "@hiogawa/utils";
import { Link, useNavigate } from "@remix-run/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import {
  PaginationComponent,
  VideoComponent,
  transitionProps,
} from "../../components/misc";
import { useModal } from "../../components/modal";
import {
  BookmarkEntryTable,
  type DeckTable,
  type UserTable,
  type VideoTable,
} from "../../db/models";
import { $R, R } from "../../misc/routes";
import { rpcClientQuery } from "../../trpc/client";
import { cls } from "../../utils/misc";
import { toast } from "../../utils/toast-utils";
import { CaptionEntry } from "../../utils/types";
import { stringifyTimestamp } from "../../utils/youtube";
import { BOOKMARK_DATA_ATTR, partitionRanges } from "./_utils";
import { VideosLoaderData } from "./index.server";

export function CaptionEntryComponent({
  entry,
  currentEntry,
  repeatingEntries = [],
  onClickEntryPlay,
  onClickEntryRepeat,
  isPlaying,
  isFocused,
  videoId,
  border = true,
  bookmarkEntries,
  // virtualized list
  virtualizer,
  virtualItem,
  isActualLast,
}: {
  entry: CaptionEntry;
  currentEntry?: CaptionEntry;
  repeatingEntries?: CaptionEntry[];
  onClickEntryPlay: (entry: CaptionEntry, toggle: boolean) => void;
  onClickEntryRepeat: (entry: CaptionEntry) => void;
  isPlaying: boolean;
  isFocused?: boolean;
  videoId?: number;
  border?: boolean;
  bookmarkEntries?: BookmarkEntryTable[];
  // virtualized list
  virtualizer?: Virtualizer<HTMLDivElement, Element>;
  virtualItem?: VirtualItem;
  isActualLast?: boolean;
}) {
  const { begin, end, text1, text2 } = entry;
  const timestamp = [begin, end].map(stringifyTimestamp).join(" - ");

  const isCurrentEntry = entry === currentEntry;
  const isRepeating = repeatingEntries.includes(entry);
  const isEntryPlaying = isCurrentEntry && isPlaying;

  return (
    <div
      className={cls(
        "w-full flex flex-col p-1 px-2 gap-1",
        border && "border",
        border && isEntryPlaying && "ring-2 ring-colorPrimaryBorder",
        border && isCurrentEntry && "border-colorPrimary",
        // quick virtualizer padding workaround
        virtualItem?.index === 0 && "mt-1.5",
        isActualLast && "mb-1.5"
      )}
      ref={virtualizer?.measureElement}
      {...{ [BOOKMARK_DATA_ATTR["data-index"]]: virtualItem?.index }}
    >
      <div className="flex items-center text-colorTextSecondary gap-2 text-xs">
        {isFocused && (
          <span className="i-ri-bookmark-line w-3 h-3 text-colorPrimary" />
        )}
        <span className="flex-1" />
        <div>{timestamp}</div>
        {!isNil(videoId) && (
          <Link
            to={$R["/videos/$id"]({ id: videoId }, { index: entry.index })}
            className="antd-btn antd-btn-ghost i-ri-vidicon-line w-4 h-4"
            data-test="caption-entry-component__video-link"
          />
        )}
        <a
          href={$R["/typing"](null, { test: entry.text1 })}
          // use "media-mouse" as keyboard detection heuristics https://github.com/w3c/csswg-drafts/issues/3871
          className="antd-btn antd-btn-ghost i-ri-keyboard-line w-4 h-4 hidden media-mouse:inline"
          target="_blank"
          data-testid="typing-link"
        />
        <button
          className={cls(
            `antd-btn antd-btn-ghost i-ri-repeat-line w-3 h-3`,
            isRepeating && "text-colorPrimary"
          )}
          onClick={() => onClickEntryRepeat(entry)}
        />
        <button
          className={cls(
            `antd-btn antd-btn-ghost i-ri-play-line w-4 h-4`,
            isEntryPlaying && "text-colorPrimary"
          )}
          onClick={() => onClickEntryPlay(entry, false)}
        />
      </div>
      <div
        className="flex cursor-pointer text-sm"
        onClick={() => onClickEntryPlay(entry, true)}
      >
        <div
          className="flex-1 pr-2 border-r"
          {...{ [BOOKMARK_DATA_ATTR["data-side"]]: "0" }}
        >
          <HighlightText
            text={text1}
            highlights={bookmarkEntries?.filter((e) => e.side === 0) ?? []}
          />
        </div>
        <div
          className="flex-1 pl-2"
          {...{ [BOOKMARK_DATA_ATTR["data-side"]]: "1" }}
        >
          <HighlightText
            text={text2}
            highlights={bookmarkEntries?.filter((e) => e.side === 1) ?? []}
          />
        </div>
      </div>
    </div>
  );
}

function HighlightText({
  text,
  highlights,
}: {
  text: string;
  highlights: { offset: number; text: string }[];
}) {
  const partitions = partitionRanges(
    text.length,
    highlights.map((h) => [h.offset, h.offset + h.text.length])
  );
  return (
    <>
      {partitions.map(([highlight, [start, end]]) => (
        <span
          key={start}
          className={cls(highlight && "text-colorPrimaryText")}
          {...{ [BOOKMARK_DATA_ATTR["data-offset"]]: start }}
        >
          {text.slice(start, end)}
        </span>
      ))}
    </>
  );
}

// TODO
// - filter (`<Filter />` in `navBarMenuComponent`)
//   - by language
//   - by author
// - order
//   - by "lastWatchedAt"
// - better layout for desktop

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
      isLoading={deleteVideoMutation.isPending}
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
  });

  function onClickPlus(deck: DeckTable) {
    if (!window.confirm(`Please confirm to add bookmarks to '${deck.name}'.`)) {
      toast.info("Cancelled to add to a deck");
      return;
    }
    newPracticeEntryMutation.mutate({ videoId, deckId: deck.id });
  }

  const isLoading = decksQuery.isLoading || newPracticeEntryMutation.isPending;

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
        className="duration-500 antd-spin-overlay-20"
        {...transitionProps("opacity-0", "opacity-100")}
      />
    </div>
  );
}

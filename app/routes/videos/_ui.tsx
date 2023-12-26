import { isNil } from "@hiogawa/utils";
import { Link } from "@remix-run/react";
import { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { BookmarkEntryTable } from "../../db/models";
import { $R } from "../../misc/routes";
import { cls } from "../../utils/misc";
import { CaptionEntry } from "../../utils/types";
import { stringifyTimestamp } from "../../utils/youtube";
import { BOOKMARK_DATA_ATTR, partitionRanges } from "./_utils";

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
          // prettier-ignore
          href={`https://10fastfingers.com/widget/typingtest?dur=600&rand=0&words=${encodeURIComponent(entry.text1)}`}
          // use "media-mouse" as keyboard detection heuristics https://github.com/w3c/csswg-drafts/issues/3871
          className="antd-btn antd-btn-ghost i-ri-keyboard-line w-4 h-4 hidden media-mouse:inline"
          target="_blank"
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

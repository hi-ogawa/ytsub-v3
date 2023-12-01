import { isNil, sortBy, uniq, zip } from "@hiogawa/utils";
import { Link } from "@remix-run/react";
import { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { z } from "zod";
import { BookmarkEntryTable } from "../../db/models";
import { $R } from "../../misc/routes";
import { cls } from "../../utils/misc";
import { CaptionEntry } from "../../utils/types";
import { stringifyTimestamp } from "../../utils/youtube";

export function partitionRanges(
  total: number,
  ranges: [number, number][]
): [boolean, [number, number]][] {
  const boundaries = uniq(sortBy(ranges.flat().concat([0, total]), (x) => x));
  return zip(boundaries, boundaries.slice(1)).map((a) => [
    ranges.some((b) => b[0] <= a[0] && a[1] <= b[1]),
    a,
  ]);
}

export function findCurrentEntry(
  entries: CaptionEntry[],
  time: number
): CaptionEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].begin <= time) {
      return entries[i];
    }
  }
  return;
}

interface BookmarkSelection {
  captionEntryIndex: number;
  side: number;
  offset: number;
  text: string;
}

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

// desperate DOM manipulation to find selected data for new bookmark creation
export function extractBookmarkSelection(
  selection: Selection
): BookmarkSelection | undefined {
  // skip empty selection
  const text = selection.toString();
  if (!text.trim()) return;
  if (selection.rangeCount === 0) return;

  // manipulate on Range
  const selectionRange = selection.getRangeAt(0);
  if (selectionRange.collapsed) return;

  const { startContainer, startOffset, endContainer } = selectionRange;

  // check selection is text node
  if (
    startContainer.nodeType !== document.TEXT_NODE ||
    endContainer.nodeType !== document.TEXT_NODE
  )
    return;

  // check "data-offset" element
  const startEl = startContainer.parentElement;
  const endEl = endContainer.parentElement;
  const dataOffset = startEl?.getAttribute(BOOKMARK_DATA_ATTR["data-offset"]);
  if (!startEl || !endEl || !dataOffset) return;

  // check start/end are contained in "data-side" element
  const dataSideEl = startEl.parentElement;
  const dataSide = dataSideEl?.getAttribute(BOOKMARK_DATA_ATTR["data-side"]);
  if (!dataSideEl || !dataSide || startEl.parentElement !== endEl.parentElement)
    return;

  // check "data-index" element
  const dataIndexEl = dataSideEl.parentElement?.parentElement;
  const dataIndex = dataIndexEl?.getAttribute(BOOKMARK_DATA_ATTR["data-index"]);
  if (!dataIndexEl || !dataIndex) return;

  return {
    captionEntryIndex: Number(dataIndex),
    side: Number(dataSide),
    offset: Number(dataOffset) + startOffset,
    text,
  };
}

const BOOKMARK_DATA_ATTR = z.enum([
  "data-index", // this is used for virtualizer too
  "data-side",
  "data-offset",
]).enum;

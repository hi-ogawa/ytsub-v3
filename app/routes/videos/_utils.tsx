import { sortBy, uniq, zip } from "@hiogawa/utils";
import { z } from "zod";
import { CaptionEntry } from "../../utils/types";

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

export const BOOKMARK_DATA_ATTR = z.enum([
  "data-index", // this is used for virtualizer too
  "data-side",
  "data-offset",
]).enum;

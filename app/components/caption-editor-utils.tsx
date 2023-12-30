import { wrapError } from "@hiogawa/utils";
import React from "react";
import { z } from "zod";
import { zipMax } from "../utils/misc";
import { TtmlEntry } from "../utils/youtube";

const Z_CAPTION_EDITOR_ENTRY = z.object({
  begin: z.number(),
  end: z.number(),
  endLocked: z.boolean(),
  text1: z.string(),
  text2: z.string(),
});

export const Z_CAPTION_EDITOR_ENTRY_LIST = Z_CAPTION_EDITOR_ENTRY.array();

export type CaptionEditorEntry = z.infer<typeof Z_CAPTION_EDITOR_ENTRY>;

export type CaptionEditorEntrySimple = Omit<CaptionEditorEntry, "endLocked">;

export function mergePartialTtmlEntries(
  input: string,
  entries2: TtmlEntry[]
): CaptionEditorEntry[] {
  const entries1 = parseManualInput(input);

  return zipMax(entries1, entries2).map(([line, e]) => ({
    begin: e?.begin ?? 0,
    end: e?.end ?? 0,
    text1: line ?? "",
    text2: e?.text ?? "",
    endLocked: true,
  }));
}

export function parseManualInput(input: string): string[] {
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s);
}

const Z_CAPTION_EDITOR_DRAFT_ITEM = z.object({
  videoId: z.string(),
  // since only videoId was saved initially, old local storage data might not have the rest of the fields.
  title: z.string().optional(),
  author: z.string().optional(),
  channelId: z.string().optional(),
});

export const Z_CAPTION_EDITOR_DRAFT_LIST = Z_CAPTION_EDITOR_DRAFT_ITEM.array();

export const STORAGE_KEYS = z.enum([
  "captionEditorEntryListByVideoId",
  "captionEditorDraftList",
]).enum;

export function useLocalStorage<Z extends z.ZodType, T = z.infer<Z>>(
  schema: Z,
  key: string
) {
  const [state, setState] = React.useState(() => {
    if (typeof window !== "undefined") {
      const item = window.localStorage.getItem(key);
      if (item) {
        const result = wrapError(() => schema.parse(JSON.parse(item)) as T);
        if (result.ok) {
          return result.value;
        }
        console.error(result.value);
      }
    }
    return;
  });

  function setStateWrapper(v: T) {
    window.localStorage.setItem(key, JSON.stringify(v));
    setState(v);
  }

  return [state, setStateWrapper] as const;
}

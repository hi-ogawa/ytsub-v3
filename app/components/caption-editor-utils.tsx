import { wrapError } from "@hiogawa/utils";
import React from "react";
import { z } from "zod";

const Z_CAPTION_EDITOR_ENTRY = z.object({
  begin: z.number(),
  end: z.number(),
  endLocked: z.boolean(),
  text1: z.string(),
  text2: z.string(),
});

export const Z_CAPTION_EDITOR_ENTRY_LIST = Z_CAPTION_EDITOR_ENTRY.array();

export type CaptionEditorEntry = z.infer<typeof Z_CAPTION_EDITOR_ENTRY>;

const Z_CAPTION_EDITOR_DRAFT_ITEM = z.object({
  videoId: z.string(),
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
